/**
 * 
 * @param {*} config 
 * @param {*} dbInstances 
 * @param {*} callback 
 */
function DefaultStorage(config, dbInstances, callback) {
    var dbName = config.name;
    var publicApi = Object.create(null);
    var _privateStore = Object();

    /**
     * 
     * @param {*} tableName 
     * @param {*} data 
     * @param {*} insertData 
     */
    function insertListener(tableName, data, insertData) {
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
        var oldData = publicApi.getItem(oldName);
        Object.keys(oldData.tables).forEach(function(tbl) {
            oldData.tables[tbl].DB_NAME = newName;
            oldData.tables[tbl].lastModified = +new Date
        });
        publicApi.setItem(newName, oldData);
        publicApi.setItem(privateApi.getResourceName(newName), publicApi.getItem(privateApi.getResourceName(oldName)));
        privateApi.getActiveDB(oldName).get(constants.RECORDRESOLVERS).rename(newName);
        publicApi.removeItem(oldName);
        (cb || noop)();
    }

    /**
     * Event listener
     */
    privateApi
        .storageEventHandler
        .subscribe(eventNamingIndex(dbName, 'insert'), insertListener)
        .subscribe(eventNamingIndex(dbName, 'update'), saveData)
        .subscribe(eventNamingIndex(dbName, 'delete'), function(tableName, delItem) {
            // remove the data
            saveData(tableName);
        })
        .subscribe(eventNamingIndex(dbName, 'onCreateTable'), onCreateTable)
        .subscribe(eventNamingIndex(dbName, 'onDropTable'), onDropTable)
        .subscribe(eventNamingIndex(dbName, 'onUpdateTable'), onUpdateTable)
        .subscribe(eventNamingIndex(dbName, 'onTruncateTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onResolveSchema'), onResolveSchema)
        .subscribe(eventNamingIndex(dbName, 'onRenameTable'), onRenameTable)
        .subscribe(eventNamingIndex(dbName, 'onAlterTable'), saveData)
        .subscribe(eventNamingIndex(dbName, 'onRenameDataBase'), onRenameDataBase);

    /**
     * 
     * @param {*} storeName 
     */
    function getStoreName(storeName) {
        return dbName + ":" + storeName;
    }

    function loadData() {
        var resource = getItem(privateApi.storeMapping.resourceName);
        if (resource) {
            _privateStore[privateApi.storeMapping.resourceName] = resource;
            _privateStore[privateApi.storeMapping.delRecordName] = getItem(privateApi.storeMapping.delRecordName);
            _privateStore[privateApi.storeMapping.pendingSync] = getItem(privateApi.storeMapping.pendingSync);
            _privateStore['version'] = getItem('version');
            Object.keys(resource.resourceManager).forEach(function(tbl) {
                _privateStore[tbl] = getItem(tbl);
                _privateStore[tbl + ":data"] = getItem(tbl + ":data");
            });
        }
    }

    function getItem(name) {
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
        delete _privateStore[name];
        window[config.type] && window[config.type].removeItem(getStoreName(name));
    };

    publicApi.clear = function() {
        window[config.type] && window[config.type].clear();
        storage = {};
    };

    publicApi.usage = function(name) {
        return JSON.stringify(storage[getStoreName(name)] || '').length;
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
 * register default storage adapters
 */
Database.storageAdapter.add(['memory', 'localStorage', 'sessionStorage'], DefaultStorage);