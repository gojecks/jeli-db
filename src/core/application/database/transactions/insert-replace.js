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
        
    const tableName = this.rawTables[0];
    const tableInfo = this.getTableInfo(tableName);
    updateRef = (updateRef || tableInfo.primaryKey);
    const time = performance.now();
    const columns = tableInfo.columns[0];
    const fieldErrors = [];
    const validator = this.validator(tableName, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    const defaultValueGenerator = tableModelMapper(tableInfo);
    const rowsToUpdate = [];
    const rowsToInsert = [];
    const tableData = this.getTableData(tableName);
    const updateRefMapper = this.getColumnValues(tableName, updateRef);
    const autoIncCallback = this.getTableIncCallback(tableInfo);
    const recordLen = records.length;

    for (let idx = 0; idx < recordLen; idx++) {
        const record = records[idx];
        const recordRefIndex = updateRefMapper.indexOf(record[updateRef]);
        if (!validator(record, idx)) continue;
        if (recordRefIndex > -1) {
            // update process
            const oldRecord = tableData[recordRefIndex];
            this.performTableAction(tableInfo, record, 'ON_UPDATE');
            record._id = (oldRecord._ref || oldRecord._id || '');
            tableData[recordRefIndex] = QueryTaskPerformer.extend(true, (oldRecord._data || oldRecord), record);
            rowsToUpdate.push(record);
        } else {
            // insert record
            const ref = GUID();
            record = autoIncCallback(defaultValueGenerator(record, ref));
            rowsToInsert.push(record);
        }
    }

    function publishAndCleanUp() {
        if (rowsToUpdate.length) {
            privateApi.storageFacade.broadcast(
                tableInfo.DB_NAME, 
                DB_EVENT_NAMES.TRANSACTION_UPDATE, 
                [tableName, rowsToUpdate.slice()]
            );
        }
        if (rowsToInsert.length) {
            privateApi.storageFacade.broadcast(
                tableInfo.DB_NAME, 
                DB_EVENT_NAMES.TRANSACTION_INSERT, 
                [tableName, rowsToInsert.slice(), true]
            );
        }

        //clear processed Data
        defaultValueGenerator.cleanup();
    }



    this.executeState.push(['insertReplace', (disableOfflineCache) => {
        //Execute Function 
        //Kill Process if error was Found
        if (this.hasError()) {
            throw new TransactionErrorEvent('insertReplace', this.getError(fieldErrors));
        }

        //push records to our sync resolver
        if (!disableOfflineCache) {
            this.updateOfflineCache('insert', this.getAllRef(rowsToInsert), tableName);
            this.updateOfflineCache('update', this.getAllRef(rowsToUpdate), tableName);
        }

        publishAndCleanUp();
        return ({
            state: "insertReplace",
            table: tableName,
            timing: performance.now() - time,
            message: `Inserted ${rowsToUpdate.length} and updated ${ rowsToUpdate.length } records`
        });

    }]);

    return this;
}