/**
 * 
 * @param {*} record 
 * @param {*} query 
 * @param {*} tableName 
 */
function transactionUpdate(record, query, tableName) {
    tableName = tableName || this.rawTables[0];
    var _this = this;
    var tableInfo = this.getTableInfo(tableName);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var fieldErrors = [];
    var validator = this.validator(tableName, columns, (field, rtype, dtype) => fieldErrors.push([field, rtype, dtype]));
    var isObjectType = isobject(record);
    var refs = [];

    /**
     * 
     * @param {*} cData 
     */
    function structureUpdateData(cData) {
        // return setData when its an object
        if (isstring(cData)) {
            //convert String Data to Object
            record = stringEqualToObject(cData);
        } else if(!isObjectType) {
            _this.setDBError('Unable to update Table(' + tableName + '), unaccepted dataType recieved');
        }
    }

    structureUpdateData();
    var tableData = this.getTableData(tableName);
    var updated = 0;
    var rowsToUpdate = [];
    /**
     * validate and update column with ON_UPDATE configuration
     */
    this.performTableAction(tableInfo, record, 'ON_UPDATE');
    validator(record, 0);

    /**
     * 
     * @param {*} data 
     * @param {*} idx 
     */
    function store(previous, idx) {
        //set the current Value
        tableData[idx]._data = extend(true, previous._data, record);
        updated++;
        /**
         * store the ref to be updated
         */
        rowsToUpdate.push({
            _ref: previous._ref,
            _data: record
        });
        // update refs
        refs.push(previous._ref);
    }

    this.executeState.push(["update", (disableOfflineCache) => {
        //Execute Function 
        //Kill Process if error was Found
        if (this.hasError() || !record) {
            throw new TransactionErrorEvent('update', this.getError(fieldErrors));
        }

        queryPerformer(tableData, query, function(data, idx) {
            store(data, idx);
        });
        //push records to our resolver
        if (!disableOfflineCache) {
            this.updateOfflineCache('update', refs, tableName);
        }

        /**
         * broadcast our event
         */
        privateApi.storageFacade.broadcast(tableInfo.DB_NAME, DB_EVENT_NAMES.TRANSACTION_UPDATE, [tableName, rowsToUpdate.slice()]);

        //empty the rows 
        rowsToUpdate.length = 0;

        //return success
        return ({
            state: "update",
            table: tableName,
            timing: performance.now() - time,
            message: updated + " row(s) updated."
        });
    }]);


    return this;
};