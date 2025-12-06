//@Function Delete
//@Arguments 'Query'
//@return Object
//@ExecuteState return {obj}
/**
 * 
 * @param {*} query  
 * WhereIn Query
 * delete -t -IN(@value([values]) @field(t1.column))
 * 
 * WhereNotIn Query
 * delete -t NOTIN(@value([values]) @field(t1.column))
 * 
 * Like Query
 * delete -t Like(@value(needle) @field(t1.column))
 */

/**
 * 
 * @param {*} query 
 * @param {*} tableName 
 */
function transactionDelete(query, tableName) {
    /**
     * make sure table is set
     */
    tableName = tableName || this.rawTables[0];
    if (!tableName)
        throw new TransactionErrorEvent('delete', 'Invalid delete statement Table is required');

    var delItem = [];
    var indexes = [];
    var time = performance.now();
    var tableData = this.getTableData(tableName);
    var tableInfo = this.getTableInfo(tableName);
    if (query && isobject(query) && query.byRefs && !isarray(query.byRefs)) {
        query.byRefs = [query.byRefs];
    }

    /**
     * remove index from indexes if defined
     * @param {*} data 
     */
    function removeIndexes(data) {
        for (var index in tableInfo.index) {
            var tableColumnIndex = tableInfo.index[index];
            var indexValue = data[index];
            // check the the index already exists
            if (tableColumnIndex.indexes && indexValue) {
                if (tableColumnIndex.groupBy){
                    var indexList = tableColumnIndex.indexes[indexValue] || [];
                    indexList.splice(indexList.indexOf(data[tableColumnIndex.groupBy]), 1);
                } else {
                    delete tableColumnIndex.indexes[indexValue];
                }
            }
        }
    }

    // run query to get all index to delete
    QueryTaskPerformer.run(tableData, query, (item, idx) => {
        delItem.push(item._ref);
        removeIndexes(item._data);
        indexes.push(idx);
    });

    this.executeState.push(['delete', (disableOfflineCache) => {
        if (delItem.length) {
            //push records to our resolver
            if (!disableOfflineCache)
                this.updateOfflineCache('delete', delItem, tableName);

            while (indexes.length) {
                tableData.splice(indexes.shift(), 1);
            }

            privateApi.storageFacade.broadcast(this.DB_NAME, DB_EVENT_NAMES.TRANSACTION_DELETE, [tableName, delItem]);
        }
        //return success Message
        return ({
            state: 'delete',
            table: tableName,
            timing: performance.now() - time,
            message: delItem.length + ' record(s) removed'
        });
    }]);


    return this;
};