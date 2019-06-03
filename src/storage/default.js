/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
function DefaultStorage(config, callback) {
    var dbName = config.name,
        publicApi = {},
        _storage = {};
    /**
     * Event listener
     */
    privateApi
        .storageEventHandler
        .subscribe(eventNamingIndex(dbName, 'insert'), function(tableName, data, lastInsertId) {
            _storage[tableName].lastInsertId = lastInsertId;
            saveData(tableName);
        })
        .subscribe(eventNamingIndex(dbName, 'update'), saveData)
        .subscribe(eventNamingIndex(dbName, 'delete'), function(tableName, delItem) {
            // remove the data
            _storage[tableName + ":data"] = _storage[tableName + ":data"].filter(function(item) {
                return !$inArray(item._ref, delItem);
            });
            saveData(tableName);
        })
        .subscribe(eventNamingIndex(dbName, 'onCreateTable'), onCreateTable)
        .subscribe(eventNamingIndex(dbName, 'onDropTable'), function(tbl) {
            publicApi.removeItem(tbl);
            publicApi.removeItem(tbl + ":data");
        })
        .subscribe(eventNamingIndex(dbName, 'onUpdateTable'), function(tbl, updates) {
            // save the data
            Object.keys(updates).forEach(function(key) {
                _storage[tbl][key] = updates[key];
            });

            publicApi.setItem(tbl, _storage[tbl]);
        })
        .subscribe(eventNamingIndex(dbName, 'onTruncateTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onResolveSchema'), function(version, tables) {
            publicApi.setItem('version', version);
            Object.keys(tables).forEach(function(tblName) {
                onCreateTable(tblName, tables[tblName]);
            });
        })
        .subscribe(eventNamingIndex(dbName, 'onRenameTable'), function(oldTable, newTable) {
            _storage[oldTable].TBL_NAME = newTable;
            publicApi.setItem(newTable, _storage[oldTable]);
            publicApi.setItem(newTable + ":data", _storage[oldTable + ":data"]);
            publicApi.removeItem(oldTable);
            publicApi.removeItem(oldTable + ":data");
        })
        .subscribe(eventNamingIndex(dbName, 'onAlterTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onRenameDataBase'), function(oldName, newName, cb) {
            var oldData = this.getItem(oldName);
            Object.keys(oldData.tables).forEach(function(tbl) {
                oldData.tables[tbl].DB_NAME = newName;
                oldData.tables[tbl].lastModified = +new Date
            });
            this.setItem(newName, oldData);
            this.setItem(privateApi.getResourceName(newName), this.getItem(privateApi.getResourceName(oldName)));
            privateApi.$getActiveDB(oldName).$get('recordResolvers').rename(newName);
            this.removeItem(oldName);
            (cb || noop)();
        });

    /**
     * 
     * @param {*} storeName 
     */
    function getStoreName(storeName) {
        return dbName + ":" + storeName;
    }

    function loadData() {
        var resource = getStorageItem(privateApi.storeMapping.resourceName);
        if (resource) {
            _storage[privateApi.storeMapping.resourceName] = resource;
            _storage[privateApi.storeMapping.delRecordName] = getStorageItem(privateApi.storeMapping.delRecordName);
            _storage[privateApi.storeMapping.pendingSync] = getStorageItem(privateApi.storeMapping.pendingSync);
            _storage['version'] = getStorageItem('version');
            Object.keys(resource.resourceManager).forEach(function(tbl) {
                _storage[tbl] = getStorageItem(tbl);
                _storage[tbl + ":data"] = getStorageItem(tbl + ":data");
            });
        }
    }

    function getStorageItem(name) {
        name = getStoreName(name);
        if (!!window[config.type]) {
            return (window[config.type][name] && JSON.parse(window[config.type][name]) || false);
        }
        // memeory support
        return _storage[name];
    }

    function saveData(tbl) {
        publicApi.setItem(tbl + ":data", _storage[tbl + ":data"]);
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} definition 
     */
    function onCreateTable(tableName, definition) {
        console.log()
            // create a new store for data
        publicApi.setItem(tableName + ":data", []);
        publicApi.setItem(tableName, definition);
    }

    publicApi.setItem = function(name, value) {
        var jsonValue = JSON.stringify(value);
        var filesizeCheck = Math.floor((((jsonValue.length) * 2) / 1024).toFixed(2));
        if (filesizeCheck >= (1024 * 10)) {
            privateApi.getNetworkResolver('logService')("_STORAGE_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
            return;
        }

        // save the item;
        _storage[name] = value;
        /**
         * support for session && localStorage
         */
        if (!!window[config.type]) {
            window[config.type][getStoreName(name)] = jsonValue;
        }
    };

    publicApi.getItem = function(name) {
        if (!name) {
            return privateApi.generateStruct(_storage);
        }
        return _storage[name];
    };

    publicApi.removeItem = function(name) {
        window[config.type].removeItem(getStoreName(name));
        delete _storage[name];
    };

    publicApi.clear = function() {
        window[config.type].clear();
        storage = {};
    };

    publicApi.usage = function(name) {
        return (window[config.type][getStoreName(name)] || '').length;
    };


    loadData();
    // trigger our callback
    setTimeout(callback);
    return publicApi;
}

/**
 * register Storage
 */
Storage('memory', DefaultStorage);
Storage('localStorage', DefaultStorage);
Storage('sessionStorage', DefaultStorage);