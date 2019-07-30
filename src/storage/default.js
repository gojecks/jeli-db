/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
function DefaultStorage(config, callback) {
    var dbName = config.name,
        publicApi = Object.create(null),
        _privateStore = {};
    /**
     * Event listener
     */
    privateApi
        .storageEventHandler
        .subscribe(eventNamingIndex(dbName, 'insert'), function(tableName, data, insertData) {
            if (insertData) {
                _privateStore[tableName + ":data"].push.apply(_privateStore[tableName + ":data"], data);
            }
            _privateStore[tableName].lastInsertId += data.length;
            saveData(tableName);
        })
        .subscribe(eventNamingIndex(dbName, 'update'), saveData)
        .subscribe(eventNamingIndex(dbName, 'delete'), function(tableName, delItem) {
            // remove the data
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
                _privateStore[tbl][key] = updates[key];
            });

            publicApi.setItem(tbl, _privateStore[tbl]);
        })
        .subscribe(eventNamingIndex(dbName, 'onTruncateTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onResolveSchema'), function(version, tables) {
            publicApi.setItem('version', version);
            Object.keys(tables).forEach(function(tblName) {
                onCreateTable(tblName, tables[tblName]);
            });
        })
        .subscribe(eventNamingIndex(dbName, 'onRenameTable'), function(oldTable, newTable) {
            _privateStore[oldTable].TBL_NAME = newTable;
            publicApi.setItem(newTable, _privateStore[oldTable]);
            publicApi.setItem(newTable + ":data", _privateStore[oldTable + ":data"]);
            publicApi.removeItem(oldTable);
            publicApi.removeItem(oldTable + ":data");
        })
        .subscribe(eventNamingIndex(dbName, 'onAlterTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onRenameDataBase'), function(oldName, newName, cb) {
            var oldData = publicApi.getItem(oldName);
            Object.keys(oldData.tables).forEach(function(tbl) {
                oldData.tables[tbl].DB_NAME = newName;
                oldData.tables[tbl].lastModified = +new Date
            });
            publicApi.setItem(newName, oldData);
            publicApi.setItem(privateApi.getResourceName(newName), publicApi.getItem(privateApi.getResourceName(oldName)));
            privateApi.$getActiveDB(oldName).$get('recordResolvers').rename(newName);
            publicApi.removeItem(oldName);
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
            _privateStore[privateApi.storeMapping.resourceName] = resource;
            _privateStore[privateApi.storeMapping.delRecordName] = getStorageItem(privateApi.storeMapping.delRecordName);
            _privateStore[privateApi.storeMapping.pendingSync] = getStorageItem(privateApi.storeMapping.pendingSync);
            _privateStore['version'] = getStorageItem('version');
            Object.keys(resource.resourceManager).forEach(function(tbl) {
                _privateStore[tbl] = getStorageItem(tbl);
                _privateStore[tbl + ":data"] = getStorageItem(tbl + ":data");
            });
        }
    }

    function getStorageItem(name) {
        name = getStoreName(name);
        if (!!window[config.type]) {
            return (window[config.type][name] && JSON.parse(window[config.type][name]) || false);
        }
        // memeory support
        return _privateStore[name];
    }

    function saveData(tbl) {
        publicApi.setItem(tbl + ":data", _privateStore[tbl + ":data"]);
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} definition 
     */
    function onCreateTable(tableName, definition) {
        // create a new store for data
        publicApi.setItem(tableName + ":data", []);
        publicApi.setItem(tableName, definition);
    }

    publicApi.setItem = function(name, value) {
        var jsonValue = JSON.stringify(value);
        var filesizeCheck = Math.floor((((jsonValue.length) * 2) / 1024).toFixed(2));
        if (filesizeCheck >= (1024 * 10)) {
            privateApi.getNetworkResolver('logService')("_privateStore_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
            return;
        }

        // save the item;
        _privateStore[name] = value;
        /**
         * support for session && localStorage
         */
        if (!!window[config.type]) {
            window[config.type][getStoreName(name)] = jsonValue;
        }
    };

    publicApi.getItem = function(name) {
        if (!name) {
            return privateApi.generateStruct(_privateStore);
        }
        return _privateStore[name];
    };

    publicApi.removeItem = function(name) {
        window[config.type].removeItem(getStoreName(name));
        delete _privateStore[name];
    };

    publicApi.clear = function() {
        window[config.type].clear();
        storage = {};
    };

    publicApi.usage = function(name) {
        return (window[config.type][getStoreName(name)] || '').length;
    };

    publicApi.isExists = function(name) {
        return _privateStore.hasOwnProperty(name);
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