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
    var fieldErrors = [];
    var processedData = [];
    var _skipped = [];
    var tableInfo = this.getTableInfo(tableName);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var objectType = isobject(data);
    var _validator = this.validator(tableInfo.TBL_NAME, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    var defaultValueGenerator = columnObjFn(tableInfo);
    var refs = [];
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
        return (tableInfo.primaryKey ? processedData[processedData.length - 1]._data[tableInfo.primaryKey] : tableInfo.lastInsertId);
    }

    /**
     * 
     * @param {*} pData 
     * @param {*} _ref 
     */
    function checkTableIndex(pData, ref) {
        var dataExists = false;
        for (var index in tableInfo.index) {
            var tableColumnIndex = tableInfo.index[index];
            if (tableColumnIndex.indexes) {
                // check the the index already exists
                if (tableColumnIndex.indexes[pData[index]]) {
                    if (tableColumnIndex.unique) {
                        dataExists = true;
                        _skipped.push(tableColumnIndex.indexes[pData[index]]);
                    }
                } else {
                    tableColumnIndex.indexes[pData[index]] = ref;
                }
            } else {
                tableColumnIndex.indexes = {};
                tableColumnIndex.indexes[pData[index]] = ref;
            }
        }

        return dataExists;
    }



    if (data.length && !this.hasError()) {
        var autoIncCallback = this.getTableIncCallback(tableInfo);
        /**
         * @param {*} record 
         * @returns 
         */
        var validateAndProcessData  = (record, index) => {
            if (hardInsert){
                refs.push(record._ref);
                processedData.push(record);
                return;
            }

            var _ref = GUID();
            var _data = defaultValueGenerator(record, _ref, tableInfo);
            
            // validate data entry
            if (!_validator(_data, index)) return;
            var dataExists = checkTableIndex(_data, _ref);
            if (!this.processData || (this.processData && !dataExists)) {
                refs.push(_ref);
                autoIncCallback(_data);
                processedData.push({
                    _ref,
                    _data
                });
            }
        };

        /**
         * check for hardInsert
         * data must contain refs
         */
        var len = data.length;
        for (var i = 0; i < len; i++) {
            var item = data.shift();
            if (hardInsert && (!item._ref || !item._data)) {
                _skipped.push(idx);
                continue;
            } else if(this.processData && !isobject(item)){
                item = copyDataByIndex(defaultValueGenerator.columnKeys, item);
            }

            validateAndProcessData(item, i);
        }
            
        if (hardInsert) {
            tableInfo.lastInsertId = (tableInfo.lastInsertId + processedData.length);
        }
        // empty data variable
        data = null;
    }

    if (!processedData.length) {
        this.setDBError('Empty insert statement, please try again.');
    }



    /**
     * Update the table content
     * @param {*} totalRecords 
     */
    function updateTable(totalRecords) {
        var totalRecords = processedData.length;
        if (totalRecords) {
            privateApi.storageFacade.broadcast(
                tableInfo.DB_NAME,
                DB_EVENT_NAMES.TRANSACTION_INSERT, 
                [tableInfo.TBL_NAME, processedData, true]
            );
        }

        //return success after push
        var lastInsertId = getLastInsertId();
        processedData.length = 0;
        refs.length = 0;
        columns = null;
        defaultValueGenerator.cleanup();
        return new InsertQueryEvent(
            tableInfo.TBL_NAME,
            lastInsertId, {
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
        if (!disableOfflineCache) {
            this.updateOfflineCache('insert', refs, tableInfo.TBL_NAME);
        }

        //push records to our resolver
        return updateTable();
    }]);



    return this;
};