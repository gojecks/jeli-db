/**
 * 
 * @param {*} name 
 */
function CoreDataResolver(name) {
    this.name = name;
    this._records = Object.create({});

    this.tableRecordHolder = function() {
        return ({
            delete: {},
            update: {},
            insert: {}
        });
    };

    if (name) {
        var lStorage = getStorageItem(privateApi.storeMapping.pendingSync, name);
        if (lStorage) {
            var _this = this;
            Object.keys(lStorage).forEach(function(key) {
                _this._records[key] = lStorage[key];
            });
        }
    }
}

CoreDataResolver.prototype.$set = function(tbl) {
    if (!this._records.hasOwnProperty(tbl)) {
        //set the record
        this._records[tbl] = { data: this.tableRecordHolder(), columns: this.tableRecordHolder() };
    }

    var _this = this;
    return Object.create({
        data: function(type, data) {
            if (data.length) {
                //push the data to the list
                data.forEach(function(ref) {
                    switch (type) {
                        case ('update'):
                            delete _this._records[tbl].data['insert'][ref];
                            break;
                        case ('delete'):
                            delete _this._records[tbl].data['insert'][ref];
                            delete _this._records[tbl].data['update'][ref];
                            break;
                    }

                    _this._records[tbl].data[type][ref] = true;
                });

                setStorageItem(privateApi.storeMapping.pendingSync, _this._records, _this.name);
            }

        },
        columns: function(type, data) {
            if (data.length) {
                //push the data to the list
                _this._records[tbl].columns[type].push.apply(_this._records[tbl].columns[type], data);

                setStorageItem(privateApi.storeMapping.pendingSync, _this._records, _this.name);
            }
        }
    });
}

CoreDataResolver.prototype.$get = function(tbl) {
    if (this._records[tbl]) {
        return this.resolveSyncData.apply(this, arguments);
    }

    return { data: this.tableRecordHolder(), columns: this.tableRecordHolder() };
};

CoreDataResolver.prototype.$isResolved = function(tbl) {
    var lStorage,
        name = this.name;
    if (this._records[tbl]) {
        delete this._records[tbl];
        lStorage = getStorageItem(privateApi.storeMapping.pendingSync, this.name);
        if (lStorage) {
            //delete from localStorage
            delete lStorage[tbl];
            setStorageItem(privateApi.storeMapping.pendingSync, lStorage, this.name);
        }
    }

    return ({
        updateTableHash: updateTableHash
    });

    /**
     * 
     * @param {*} checksum 
     */
    function updateTableHash(checksum) {
        if (checksum) {
            privateApi.$taskPerformer
                .updateDB(name, tbl, function(table) {
                    table._previousHash = table._hash;
                    table._hash = checksum;
                });
        }
    }
};

CoreDataResolver.prototype.$destroy = function() {
    if ($isEmptyObject(this._records)) {
        this._records = Object.create({});
        delStorageItem(privateApi.storeMapping.pendingSync);
    }
};

CoreDataResolver.prototype.rename = function(newName) {
    setStorageItem(privateApi.getDataResolverName(newName), this._records, this.name);
    delStorageItem(privateApi.storeMapping.pendingSync);
};

/**
 * 
 * @param {*} tbl 
 * @param {*} type 
 * @param {*} cref 
 */
CoreDataResolver.prototype.resolveSyncData = function(tbl, type, cref) {
    var recordsToSync = jEliDeepCopy(this._records[tbl]),
        name = this.name,
        _newSyncData = {};

    /**
     * user specifies the type and ref to resolve
     * type : @types
     * ref : @ref DATA || COLUMN
     */
    if (type) {
        _newSyncData[type] = ($isEqual(type, "delete") ? {} : []);
    } else {
        _newSyncData.data = {
            'delete': {},
            update: [],
            insert: []
        }
    }

    Object.keys(_newSyncData.data).forEach(function(cType) {
        Object.keys(recordsToSync.data[cType]).forEach(function(ref) {
            if ($isEqual(cType, "delete")) {
                _newSyncData.data[cType][ref] = true;
            } else {
                var data = privateApi.$getDataByRef(privateApi.$getTableOptions(name, tbl, 'data') || [], ref);
                if (data) {
                    _newSyncData.data[cType].push(data);
                }
            }
        });
    });

    recordsToSync = null;

    return _newSyncData;
};