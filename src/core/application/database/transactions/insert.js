/**
 * 
 * @param {*} data 
 * @param {*} hardInsert 
 * @param {*} tableName  optional
 */
function transactionInsert(data, hardInsert, tableName) {
    /**
     * make sure table is set
     */
    tableName = tableName || this.rawTables[0];
    const fieldErrors = [];
    const processedData = [];
    const _skipped = [];
    const tableInfo = this.getTableInfo(tableName);
    const time = performance.now();
    const columns = tableInfo.columns[0];
    const objectType = isobject(data);
    const _validator = this.validator(tableInfo.TBL_NAME, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    const defaultValueGenerator = tableModelMapper(tableInfo);
    const refs = [];
    /**
     * Data must an Array or Object format
     * throw error if not in the format
     */
    if (!isarray(data) && !objectType) {
        this.setDBError("Invalid dataType received, accepted types are  (ARRAY or OBJECT)");
    }

    /**
     * pardon object property
     * @deprecated
     */
    if (objectType) {
        console.warn('[INSERT]: Support for Object data will be removed in later version');
        data = [data];
    }


    /**
     * 
     * @param {*} item 
     * @param {*} keys 
     */
    function copyDataByIndex(keys, item) {
        return keys.reduce(function(accum, key, index) {
            accum[key] = item[index];
        }, {});
    }


    function getLastInsertId(){
        // data compactibility support
        const record = processedData[processedData.length - 1];
        return (tableInfo.primaryKey ? (record._data || record)[tableInfo.primaryKey] : tableInfo.lastInsertId);
    }

    /**
     * 
     * @param {*} pData 
     * @param {*} _ref 
     */
    function checkTableIndex(pData, ref) {
        let dataExists = false;
        for (let index in tableInfo.index) {
            const tableColumnIndex = tableInfo.index[index];
            // check the the index already exists
            const groupBy = tableColumnIndex.groupBy;
            const indexValue = pData[index];
            ref = groupBy ? pData[groupBy] : ref;
            if (tableColumnIndex.indexes) {
                if (tableColumnIndex.indexes[indexValue]) {
                    if (tableColumnIndex.unique) {
                        dataExists = (groupBy ? tableColumnIndex.indexes[indexValue].includes(ref) : true);
                        if (!dataExists) {
                            if (groupBy){
                                if (!Array.isArray(tableColumnIndex.indexes[indexValue]))
                                    tableColumnIndex.indexes[indexValue] = [];
                                tableColumnIndex.indexes[indexValue].push(ref);
                            } else {
                                tableColumnIndex.indexes[indexValue] = ref;
                            }
                        }
                        _skipped.push(ref);
                    }
                } else {
                    tableColumnIndex.indexes[indexValue] = (groupBy ? [ref] : ref);
                }
            } else {
                // first time creating indexes records
                tableColumnIndex.indexes = {};
                tableColumnIndex.indexes[indexValue] = (groupBy ? [ref] : ref);
            }
        }

        return dataExists;
    }



    if (data.length && !this.hasError()) {
        const autoIncCallback = this.getTableIncCallback(tableInfo);
        /**
         * @param {*} record 
         * @returns 
         */
        const validateAndProcessData  = (record, index) => {
            const ref = record._ref || record._id || GUID();
            if (hardInsert && ref){
                refs.push(ref);
                // move to new record format
                record = record._data || record;
                record._id = ref;
                processedData.push(record);
                return;
            }

            record = defaultValueGenerator(record, ref, tableInfo);
            // validate data entry
            if (!_validator(record, index)) return;
            const dataExists = checkTableIndex(record, ref);
            if (!this.processData || (this.processData && !dataExists)) {
                refs.push(ref);
                autoIncCallback(record);
                processedData.push(record);
            }
        };

        /**
         * check for hardInsert
         * data must contain refs
         */
        const len = data.length;
        for (let i = 0; i < len; i++) {
            const item = data.shift();
            if(this.processData && !isobject(item)){
                item = copyDataByIndex(defaultValueGenerator.columnKeys, item);
            }

            validateAndProcessData(item, i);
        }
            
        if (hardInsert) {
            tableInfo.lastInsertId = (tableInfo.lastInsertId + processedData.length);
        }
    }

    if (!processedData.length) {
        this.setDBError('Empty insert statement, please try again.');
    }


    function updateTable() {
        const totalRecords = processedData.length;
        const lastInsertId = getLastInsertId();
        if (totalRecords) {
            privateApi.storageFacade.broadcast(
                tableInfo.DB_NAME,
                DB_EVENT_NAMES.TRANSACTION_INSERT, 
                [tableInfo.TBL_NAME, processedData.splice(0), true]
            );
        }

        //return success after push
        defaultValueGenerator.cleanup();
        return new InsertQueryEvent(
            tableInfo.TBL_NAME,
            lastInsertId,
            refs.splice(0),
            {
                timing: performance.now() - time,
                message: totalRecords + " record(s) inserted successfully, skipped " + _skipped.length + " existing record(s)",
                skippedRecords: _skipped.slice(0)
            });
    }

    this.executeState.push(["insert", (disableOfflineCache) => {
        //errorLog Must be empty
        if (this.hasError()) {
            //clear processed Data
            processedData.length = 0;
            _skipped.length = 0;
            throw new TransactionErrorEvent('insert', this.getError(fieldErrors));
        }

        // update offline
        if (!disableOfflineCache){
            this.updateOfflineCache('insert', refs, tableInfo.TBL_NAME);
        }

        //push records to our resolver
        return updateTable();
    }]);


    return this;
};