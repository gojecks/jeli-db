function mockStorage() {
    this.setItem
}

/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} callback 
 */
function DefaultStorage(config, storageUtils, callback) {
    var dbName = config.name;
    var publicApi = Object.create(null);
    var _privateStore = Object();
    var _eventRegistry = new Map();
    var _storage = (self && self[config.type]);

    /**
     * 
     * @param {*} tableName 
     * @param {*} data 
     * @param {*} insertData 
     */
    function insertEvent(tableName, data, insertData) {
        if (insertData) {
            _privateStore[tableName + ":data"].push.apply(_privateStore[tableName + ":data"], data);
        }
        _privateStore[tableName].lastInsertId += data.length;
        saveData(tableName);
    }

    /**
     * 
     * @param {*} tbl 
     */
    function onDropTable(tbl) {
        publicApi.removeItem(tbl);
        publicApi.removeItem(tbl + ":data");
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} updates 
     */
    function onUpdateTable(tbl, updates) {
        // save the data
        Object.keys(updates).forEach(function(key) {
            _privateStore[tbl][key] = updates[key];
        });

        publicApi.setItem(tbl, _privateStore[tbl]);
    }

    /**
     * 
     * @param {*} version 
     * @param {*} tables 
     */
    function onResolveSchema(version, tables) {
        publicApi.setItem('version', version);
        Object.keys(tables).forEach(function(tblName) {
            onCreateTable(tblName, tables[tblName]);
        });
    }

    /**
     * 
     * @param {*} oldTable 
     * @param {*} newTable 
     */
    function onRenameTable(oldTable, newTable) {
        _privateStore[oldTable].TBL_NAME = newTable;
        publicApi.setItem(newTable, _privateStore[oldTable]);
        publicApi.setItem(newTable + ":data", _privateStore[oldTable + ":data"]);
        publicApi.removeItem(oldTable);
        publicApi.removeItem(oldTable + ":data");
    }

    /**
     * 
     * @param {*} oldName 
     * @param {*} newName 
     * @param {*} cb 
     */
    function onRenameDataBase(oldName, newName, cb) {
        var resource = publicApi.getItem(storageUtils.storeMapping.resourceName);
        Object.keys(resource.resourceManager).forEach(function(tbl) {
            _privateStore[tbl].DB_NAME = newName;
            _privateStore[tbl].lastModified = +new Date;
        });
        var clonedObject = Object.assign({}, _privateStore);
        var propertyNames = Object.keys(clonedObject);
        for (const name of propertyNames) {
            dbName = oldName;
            publicApi.removeItem(name);
            dbName = newName;
            publicApi.setItem(name, clonedObject[name]);
        }
        // change the dbName variable
        dbName = newName;
        (cb || noop)();
    }

    /**
     * Event Event
     */
    _eventRegistry.set('insert', insertEvent);
    _eventRegistry.set('update', saveData);
    _eventRegistry.set('delete', function(tableName, delItem) {
        // remove the data
        saveData(tableName);
    });
    _eventRegistry.set('onCreateTable', onCreateTable);
    _eventRegistry.set('onDropTable', onDropTable);
    _eventRegistry.set('onUpdateTable', onUpdateTable);
    _eventRegistry.set('onTruncateTable', saveData);
    _eventRegistry.set('onResolveSchema', onResolveSchema);
    _eventRegistry.set('onRenameTable', onRenameTable);
    _eventRegistry.set('onAlterTable', saveData);
    _eventRegistry.set('onRenameDataBase', onRenameDataBase);

    /**
     * 
     * @param {*} storeName 
     */
    function getStoreName(storeName) {
        return dbName + ":" + storeName;
    }

    function loadData() {
        var resource = getItem(storageUtils.storeMapping.resourceName);
        if (resource) {
            _privateStore[storageUtils.storeMapping.resourceName] = resource;
            _privateStore[storageUtils.storeMapping.delRecordName] = getItem(storageUtils.storeMapping.delRecordName);
            _privateStore[storageUtils.storeMapping.pendingSync] = getItem(storageUtils.storeMapping.pendingSync);
            _privateStore['version'] = getItem('version');
            if (resource.resourceManager) {
                Object.keys(resource.resourceManager).forEach(function(tbl) {
                    _privateStore[tbl] = getItem(tbl);
                    _privateStore[tbl + ":data"] = getItem(tbl + ":data");
                });
            }
        }
    }

    function getItem(name) {
        name = getStoreName(name);
        if (_storage) {
            return (_storage[name] && JSON.parse(_storage[name]) || false);
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
        /**
         * we only set data property if its a new table and not exists
         */
        if (!_privateStore.hasOwnProperty(tableName)) {
            publicApi.setItem(tableName, definition);
            publicApi.setItem(tableName + ":data", []);
        } else {
            /**
             * extend the existing with the new
             */
            publicApi.setItem(tableName, definition);
        }
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
        if (_storage) {
            _storage[getStoreName(name)] = jsonValue;
        }
    };

    publicApi.getItem = function(name) {
        if (!name) {
            return storageUtils.generateStruct(_privateStore);
        }
        return _privateStore[name];
    };

    publicApi.removeItem = function(name) {
        delete _privateStore[name];
        if (_storage) {
            _storage.removeItem(getStoreName(name));
        }
    };

    publicApi.clear = function() {
        if (_storage) {
            _storage.clear();
        }

        _privateStore = {};
    };

    publicApi.usage = function(name) {
        return JSON.stringify(_privateStore || '').length;
    };

    publicApi.isExists = function(name) {
        return _privateStore.hasOwnProperty(name);
    };

    publicApi.broadcast = function(eventName, args) {
        if (_eventRegistry.has(eventName)) {
            _eventRegistry.get(eventName).apply(null, args);
        }
    }


    loadData();
    // trigger our callback
    setTimeout(callback);
    return publicApi;
}
/**
 * register default storage adapters
 */
Database.storageAdapter.add(['memory', 'localStorage', 'sessionStorage'], DefaultStorage);