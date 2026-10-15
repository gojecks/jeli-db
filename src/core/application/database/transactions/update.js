/**
 * 
 * @param {*} updateRecords 
 * @param {*} isMany 
 * @returns 
 */
function transactionUpdate(updateRecords) {
    const tableName = this.rawTables[0];
    const tableInfo = this.getTableInfo(tableName);
    const time = performance.now();
    const columns = tableInfo.columns[0];
    const fieldErrors = [];
    const validator = this.validator(tableName, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    const refs = [];
    const tableData = this.getTableData(tableName);
    let updated = 0;
    const rowsToUpdate = [];

    // return setData when its an object
    if (!Array.isArray(updateRecords)) {
        this.setDBError(`Unable to update Table(${tableName}), unaccepted dataType recieved`);
    }


    /**
     * @param {*} record 
     * @param {*} data 
     */
    function collectRecords(record, hasExpressions) {
        const keys = Object.keys(record);
        return data => {
            if (!hasExpressions) {
                return record;
            } else {
                return keys.reduce((accum, key) => {
                    if (key == '$exp') {
                        const prop = record[key].key;
                        accum[prop] = data[prop];
                    } else {
                        accum[key] = record[key];
                    }
                    return accum;
                }, {});
            }
        };
    }

    /**
     * validate and update column with ON_UPDATE configuration
     */
    updateRecords.forEach(record => {
        this.performTableAction(tableInfo, record[1], 'ON_UPDATE');
        validator(record[1], 0);
        record[2] = collectRecords(record[1], record[1].hasOwnProperty('$exp'));
    });

    this.executeState.push(['update', (disableOfflineCache) => {
        //Execute Function 
        //Kill Process if error was Found
        if (this.hasError() || !updateRecords) {
            throw new TransactionErrorEvent('update', this.getError(fieldErrors));
        }

        QueryTaskPerformer.runMany(tableData, updateRecords.map(record => record[0]), (previous, idx, matchIndex) => {
            //set the current Value
            const record = updateRecords[matchIndex];
            // record compactibility support
            const lastestRecord = QueryTaskPerformer.extend(true, (previous._data || previous), record[1])
            // backward compactibility for _data format
            if(!lastestRecord._id && previous._ref){
                lastestRecord._id = previous._ref;
            }

            tableData[idx] = lastestRecord;

            updated++;
            // store the ref to be updated
            const ref = lastestRecord._id;
            rowsToUpdate.push( record[2](previous._data || previous) );
            // update refs
            refs.push([ref, record[1]]);
        }, updateRecords.length);

        //push records to our resolver
        if (!disableOfflineCache) {
            this.updateOfflineCache('update', refs, tableName);
        }

        // broadcast our event
        privateApi.storageFacade.broadcast(tableInfo.DB_NAME, DB_EVENT_NAMES.TRANSACTION_UPDATE, [tableName, rowsToUpdate.slice()]);
        //empty the rows 
        rowsToUpdate.length = 0;

        //return success
        return new UpdateQueryEvent(tableName, updated, time, refs.splice(0));
    }]);


    return this;
};