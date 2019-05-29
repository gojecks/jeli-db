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
function transactionDelete(query) {
    var $self = this,
        delItem = [];
    if (query) {
        if ($isObject(query) && query.hasOwnProperty('byRefs')) {
            if (!$isArray(query.byRefs)) {
                throw Error(["ByRefs requires ArrayList<ref>"]);
            }

            $self.tableInfo.data = $self.tableInfo.data.filter(function(item) {
                return !$inArray(item._ref, query.byRefs);
            });

            delItem = query.byRefs;
        } else {
            new $query(this.tableInfo.data)._(query, function(item, idx) {
                delItem.push(item._ref);
            });
        }
    } else {
        delItem = $self.getAllRef();
        $self.tableInfo.data = [];
    }

    this.executeState.push(["delete", function(disableOfflineCache) {
        if (delItem.length) {
            //push records to our resolver
            if (!disableOfflineCache) {
                $self.updateOfflineCache('delete', delItem);
            }

            privateApi
                .storageEventHandler
                .broadcast(eventNamingIndex($self.tableInfo.DB_NAME, 'delete'), [$self.tableInfo.TBL_NAME, delItem]);
        }
        //return success Message
        return ({
            message: delItem.length + " record(s) removed"
        });
    }]);

    return this;
};