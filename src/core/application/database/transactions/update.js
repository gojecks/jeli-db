/**
 * 
 * @param {*} updateRecords 
 * @param {*} isMany 
 * @returns 
 */
function transactionUpdate(updateRecords) {
    var tableName = this.rawTables[0];
    var tableInfo = this.getTableInfo(tableName);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var fieldErrors = [];
    var validator = this.validator(tableName, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    var refs = [];
    var tableData = this.getTableData(tableName);
    var updated = 0;
    var rowsToUpdate = [];

    // return setData when its an object
    if (!Array.isArray(updateRecords)) {
        this.setDBError(`Unable to update Table(${tableName}), unaccepted dataType recieved`);
    }


    /**
     * @param {*} record 
     * @param {*} data 
     */
    function collectRecords(record, hasExpressions) {
        var keys = Object.keys(record);
        return data => {
            if (!hasExpressions) {
                return record;
            } else {
                return keys.reduce((accum, key) => {
                    if (key == '$exp') {
                        var obj = record[key];
                        accum[obj.key] = data[obj.key];
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
            tableData[idx]._data = QueryTaskPerformer.extend(true, previous._data, record[1]);
            updated++;
            // store the ref to be updated
            rowsToUpdate.push({
                _ref: previous._ref,
                _data: record[2](previous._data)
            });
            // update refs
            refs.push([previous._ref, record[1]]);
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