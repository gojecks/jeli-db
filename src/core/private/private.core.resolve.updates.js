/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 * @param {*} data 
 */
_privateApi.prototype.$resolveUpdate = function(db, tbl, data) {
    var $promise = new $p(),
        self = this;
    if (db && tbl && data) {
        var tbl = this.$getTable(db, tbl),
            types = ["insert", "delete", "update"],
            _task = {},
            _ret = { update: [], "delete": [], insert: [] };

        _task.update = function(cdata) {
            expect(tbl.data).each(function(item, idx) {
                expect(cdata).each(function(obj) {
                    if (item._ref === obj._ref) {
                        tbl.data[idx] = obj;
                    }
                });
            });

            _ret.update.push.apply(_ret.update, cdata.map(function(_item_) { return _item_._data; }));
        };

        _task['delete'] = function(cdata) {
            tbl.data = tbl.data.filter(function(item) {
                return !$inArray(item._ref, cdata);
            });
            _ret['delete'].push.apply(_ret['delete'], cdata.map(function(_item_) { return _item_._ref; }));
        };

        _task.insert = function(cdata) {
            tbl.data.push.apply(tbl.data, cdata);
            _ret.insert.push.apply(_ret.insert, cdata.map(function(_item_) { return _item_._data; }));
        };

        if (tbl) {
            types.forEach(function(name) {
                if (data[name] && data[name].length) {
                    _task[name](data[name]);
                    self.storageEventHandler.broadcast(eventNamingIndex(db, name), [tbl.TBL_NAME, data[name]]);
                }
            });

            $promise.resolve(copy(_ret, true));
        }
    } else {
        $promise.reject();
    }

    return $promise;
};