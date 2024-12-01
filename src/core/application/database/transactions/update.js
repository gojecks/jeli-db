/**
 * 
 * @param {*} record 
 * @param {*} query 
 * @param {*} tableName 
 */
function transactionUpdate(record, query, tableName) {
    tableName = tableName || this.rawTables[0];
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
    if (isstring(record)) {
        //convert String Data to Object
        record = stringEqualToObject(record);
    } else if(!isobject(record)) {
        this.setDBError('Unable to update Table(' + tableName + '), unaccepted dataType recieved');
    }

    /**
     * validate and update column with ON_UPDATE configuration
     */
    this.performTableAction(tableInfo, record, 'ON_UPDATE');
    validator(record, 0);

    /**
     * @param {*} record 
     * @param {*} data 
     */
    function collectRecords(record, hasExpressions){
        var keys = Object.keys(record);
        return data => {
            if (!hasExpressions) {
                return record;
            } else {
                return keys.reduce((accum, key)=> {
                    if (key == '$exp'){
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

    this.executeState.push(['update', (disableOfflineCache) => {
        //Execute Function 
        //Kill Process if error was Found
        if (this.hasError() || !record){
            throw new TransactionErrorEvent('update', this.getError(fieldErrors));
        }

        var hasExpressions = record.hasOwnProperty('$exp');
        var cRecords = collectRecords(record, hasExpressions);
        QueryTaskPerformer.run(tableData, query, (previous, idx) => {
            //set the current Value
            tableData[idx]._data = QueryTaskPerformer.extend(true, previous._data, record);
            updated++;
            // store the ref to be updated
            rowsToUpdate.push({
                _ref: previous._ref,
                _data: cRecords(previous._data)
            });
            // update refs
            refs.push(previous._ref);
        });

        //push records to our resolver
        if (!disableOfflineCache){
            this.updateOfflineCache('update', refs, tableName, record);
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