/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 * @param {*} data 
 */
CoreInstance.prototype.$resolveUpdate = function(db, tbl, data) {
    var _promise = new _Promise(),
        self = this;
    if (db && tbl && data) {
        var tbl = this.getTable(db, tbl),
            exisitingRefs = tbl.data.map(function(item) { return item._ref; }),
            types = ["insert", "delete", "update"],
            _task = {},
            _ret = { update: [], "delete": [], insert: [] };

        _task.update = function(cdata) {
            return cdata.reduce(function(accum, item) {
                var idx = exisitingRefs.indexOf(item._ref);
                if (idx > -1) {
                    tbl.data[idx]._data = item._data;
                    _ret.update.push(item._data);
                    accum.push(item);
                }

                return accum;
            }, []);
        };

        _task['delete'] = function(cdata) {
            tbl.data = tbl.data.filter(function(item) {
                return !$inArray(item._ref, cdata);
            });
            _ret['delete'] = cdata;
            return cdata;
        };

        _task.insert = function(cdata) {
            return cdata.reduce(function(accum, item) {
                if (exisitingRefs.indexOf(item._ref) < 0) {
                    tbl.data.push(item);
                    _ret.insert.push(item._data);
                    accum.push(item);
                }

                return accum;
            }, []);
        };

        if (tbl) {
            types.forEach(function(type) {
                if (data.hasOwnProperty(type) && data[type].length) {
                    var eventValue = _task[type](data[type]);
                    self.storageEventHandler.broadcast(eventNamingIndex(db, type), [tbl.TBL_NAME, eventValue, false]);
                }
            });
            var deepCloneRet = copy(_ret, true);
            _promise.resolve(deepCloneRet);
        }
    } else {
        _promise.reject();
    }

    return _promise;
};