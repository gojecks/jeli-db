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
    var $self = this,
        delItem = [],
        time = performance.now(),
        tableInfo = this.getTableInfo(tableName);
    if (query) {
        if ($isObject(query) && query.hasOwnProperty('byRefs')) {
            if (!$isArray(query.byRefs)) {
                throw Error("ByRefs requires ArrayList<ref>");
            }

            delItem = query.byRefs;
        } else {
            new $query(tableInfo.data)._(query, function(item, idx) {
                delItem.push(item._ref);
            });
        }
    } else {
        delItem = $self.getAllRef(tableName);
    }

    this.executeState.push(["delete", function(disableOfflineCache) {
        if (delItem.length) {
            //push records to our resolver
            if (!disableOfflineCache) {
                $self.updateOfflineCache('delete', delItem, tableInfo.TBL_NAME);
            }

            /**
             * Remove all data by filtering
             */
            var dataLen = tableInfo.data.length
            if ($isEqual(delItem.length, dataLen)) {
                tableInfo.data.length = 0;
            } else {
                while (dataLen--) {
                    var item = tableInfo.data[dataLen];
                    if ($inArray(item._ref, delItem)) {
                        /**
                         * remove the object
                         */
                        tableInfo.data.splice(dataLen, 1);
                    }
                }
            }

            privateApi
                .storageEventHandler
                .broadcast(eventNamingIndex(tableInfo.DB_NAME, 'delete'), [tableInfo.TBL_NAME, delItem]);
        }
        //return success Message
        return ({
            state: "delete",
            table: tableInfo.TBL_NAME,
            result: {
                timing: performance.now() - time,
                message: delItem.length + " record(s) removed"
            }
        });
    }]);


    return this;
};