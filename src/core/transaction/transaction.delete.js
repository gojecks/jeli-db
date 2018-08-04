//@Function Delete
//@Arguments 'Query'
//@return Object
//@ExecuteState return {obj}

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
            new $query(this.tableInfo.data.slice())._(query, function(item, idx) {
                delItem.push(item._ref);
                $self.tableInfo.data.splice(idx, 1);
            });
        }
    } else {
        delItem = $self.getAllRef();
    }

    this.executeState.push(["delete", function(disableOfflineCache) {
        if (!delItem.length) {
            throw Error(["No record(s) to remove"]);
        } else {
            //push records to our resolver
            if (!disableOfflineCache) {
                $self.updateOfflineCache('delete', delItem);
            }

            /**
                broadcast event
            **/
            $queryDB.storageEventHandler.broadcast(eventNamingIndex($self.tableInfo.DB_NAME, 'delete'), [$self.tableInfo.TBL_NAME, delItem]);

            //return success Message
            return ({
                message: delItem.length + " record(s) removed"
            });
        }
    }]);

    return this;
};