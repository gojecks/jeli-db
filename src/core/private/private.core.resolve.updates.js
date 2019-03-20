/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 * @param {*} data 
 */
_privateApi.prototype.$resolveUpdate = function(db, tbl, data) {
    var _promise = new _Promise(),
        self = this;
    if (db && tbl && data) {
        var tbl = this.$getTable(db, tbl),
            exisitingRefs = tbl.data.map(function(item) { return item._ref; }),
            types = ["insert", "delete", "update"],
            _task = {},
            _ret = { update: [], "delete": [], insert: [] };

        _task.update = function(cdata) {
            cdata.forEach(function(item) {
                var idx = exisitingRefs.indexOf(item._ref);
                if (0 > idx) {
                    tbl.data[idx].data = item.data;
                    _ret.update.push(item._data);
                }
            });
        };

        _task['delete'] = function(cdata) {
            tbl.data = tbl.data.filter(function(item) {
                return !$inArray(item._ref, cdata);
            });
            _ret['delete'].push.apply(_ret['delete'], cdata.map(function(_item_) { return _item_._ref; }));
        };

        _task.insert = function(cdata) {
            cdata.forEach(function(item) {
                if (exisitingRefs.indexOf(item._ref) < 0) {
                    tbl.data.push(item);
                    _ret.insert.push(item._data);
                }
            })
        };

        if (tbl) {
            types.forEach(function(name) {
                if (data[name] && data[name].length) {
                    _task[name](data[name]);
                    self.storageEventHandler.broadcast(eventNamingIndex(db, name), [tbl.TBL_NAME, data[name]]);
                }
            });

            _promise.resolve(copy(_ret, true));
        }
    } else {
        _promise.reject();
    }

    return _promise;
};