//@Function Delete
//@Arguments 'Query'
//@return Object
//@ExecuteState return {obj}
/**
 * 
 * @param {*} query 
 * 
 * 
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
    var _this = this;
    var delItem = [];
    var time = performance.now();
    var tableData = this.getTableData(tableName);
    if (query) {
        if (isobject(query) && query.hasOwnProperty('byRefs')) {
            if (!isarray(query.byRefs)) {
                throw Error("ByRefs requires ArrayList<ref>");
            }

            delItem = query.byRefs;
        } else {
            _queryPerformer(tableData, query, function(item, idx) {
                delItem.push(item._ref);
            });
        }
    } else {
        delItem = this.getAllRef(tableData);
    }

    this.executeState.push(["delete", function(disableOfflineCache) {
        if (delItem.length) {
            //push records to our resolver
            if (!disableOfflineCache) {
                _this.updateOfflineCache('delete', delItem, tableName);
            }

            /**
             * Remove all data by filtering
             */
            var dataLen = tableData.length
            if (isequal(delItem.length, dataLen)) {
                tableData.length = 0;
            } else {
                while (dataLen--) {
                    var item = tableData[dataLen];
                    if (inarray(item._ref, delItem)) {
                        /**
                         * remove the object
                         */
                        tableData.splice(dataLen, 1);
                    }
                }
            }

            privateApi.storageFacade.broadcast(_this.DB_NAME, DB_EVENT_NAMES.TRANSACTION_DELETE, [tableName, delItem]);
        }
        //return success Message
        return ({
            state: "delete",
            table: tableName,
            result: {
                timing: performance.now() - time,
                message: delItem.length + " record(s) removed"
            }
        });
    }]);


    return this;
};