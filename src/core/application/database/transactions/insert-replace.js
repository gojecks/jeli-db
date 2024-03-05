/**
 * 
 * @param {*} data 
 * @param {*} updateRef 
 */
function TransactionInsertReplace(records, updateRef) {
    if (records && !isarray(records)){
        console.warn('[DBInsertReplace] Support for object type will be removed in upcoming version');
        // convert object to array
        records = [records];
    }
        
    var tableName = this.rawTables[0];
    var tableInfo = this.getTableInfo(tableName);
    updateRef = (updateRef || tableInfo.primaryKey);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var fieldErrors = [];
    var validator = this.validator(tableName, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    var defaultValueGenerator = columnObjFn(columns);
    var rowsToUpdate = [];
    var rowsToInsert = [];
    var tableData = this.getTableData(tableName);
    var updateRefMapper = this.getColumnValues(tableName, updateRef);
    var autoIncCallback = this.getTableIncCallback(tableInfo);
    var recordLen = records.length;

    for (var idx = 0; idx < recordLen; idx++) {
        var record = records[idx];
        var recordRefIndex = updateRefMapper.indexOf(record[updateRef]);
        if (!validator(record, idx)) continue;
        if (recordRefIndex > -1) {
            // update process
            var _ref = tableData[recordRefIndex]._ref;
            this.performTableAction(tableInfo, record, 'ON_UPDATE');
            tableData[recordRefIndex]._data = extend(true, tableData[recordRefIndex]._data, record);
            rowsToUpdate.push({
                _ref,
                _data: record
            });
        } else {
            // insert record
            var _ref = GUID();
            record = autoIncCallback(defaultValueGenerator(record, _ref));
            rowsToInsert.push({
                _ref,
                _data: record
            });
        }
    }

    function publishAndCleanUp() {
        privateApi.storageFacade.broadcast(
            tableInfo.DB_NAME, 
            DB_EVENT_NAMES.TRANSACTION_UPDATE, 
            [tableName, rowsToUpdate.slice()]
        );

        privateApi.storageFacade.broadcast(
            tableInfo.DB_NAME, 
            DB_EVENT_NAMES.TRANSACTION_INSERT, 
            [tableName, rowsToInsert.slice(), true]
        );

        //clear processed Data
        tableInfo = columns = null;
        rowsToInsert.length = 0;
        updateRefMapper.length = 0;
        rowsToUpdate.length = 0;
    }



    this.executeState.push(['insertReplace', (disableOfflineCache) => {
        //Execute Function 
        //Kill Process if error was Found
        if (this.hasError()) {
            throw new TransactionErrorEvent('insertReplace', this.getError(fieldErrors));
        }

        //push records to our sync resolver
        if (!disableOfflineCache) {
            this.updateOfflineCache('insertReplace', {
               update: this.getAllRef(rowsToUpdate),
               insert: this.getAllRef(rowsToInsert)
            }, tableName);
        }

        var totalUpd = rowsToUpdate.length;
        var totalIns = rowsToUpdate.length;

        publishAndCleanUp();
        return ({
            state: "insertReplace",
            table: tableName,
            timing: performance.now() - time,
            message: "Inserted " + totalIns + " and updated " + totalUpd + ' records'
        });

    }]);

    return this;
}