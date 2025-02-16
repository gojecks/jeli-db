/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} callback 
 */
function DefaultStorage(config, storageUtils, callback) {
    var dbName = config.name;
    var _privateStore = new Map();
    var _storage = (self && self[config.type]);
    var getStoreKey = key => `${key}:data`;


    class publicApi{
        static setItem(name, value){
            var jsonValue = JSON.stringify(value);
            var filesizeCheck = Math.floor((((jsonValue.length) * 2) / 1024).toFixed(2));
            if (filesizeCheck >= (1024 * 10)) {
                privateApi.getConfigData('logService')("_privateStore_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
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
        }
        static getItem(name){
            if (!name) {
                return storageUtils.generateStruct(_privateStore);
            }

            return _privateStore[name];
        }

        static removeItem(name) {
            delete _privateStore[name];
            if (_storage) {
                _storage.removeItem(getStoreName(name));
            }
        }

        static clear(callback) {
            if (_storage) {
                _storage.clear();
            }

            _privateStore = {};
            callback(true)
        }

        static usage(name) {
            return JSON.stringify(_privateStore || '').length;
        }
        
        static isExists(name) {
            return _privateStore.hasOwnProperty(name);
        }

        static broadcast(eventName, args) {
            EventRegistry._call(eventName, args);
        }
    };

    class EventRegistry {
        static _call(eventName, args){
            if (this[eventName]){
                this[eventName].apply(EventRegistry, args);
            }
        }

        static insert(tableName, data, insertData) {
            if (insertData) {
                _privateStore[getStoreKey(tableName)].push.apply(_privateStore[getStoreKey(tableName)], data);
            }
            _privateStore[tableName].lastInsertId += data.length;
            this.update(tableName);
        }
        
        static update(tbl) {
            publicApi.setItem(getStoreKey(tbl), _privateStore[getStoreKey(tbl)]);
        }

        static delete(tableName, delItem) {
            // remove the data
            this.update(tableName);
        }

        static onCreateTable(tableName, definition) {
            /**
             * we only set data property if its a new table and not exists
             */
            if (!_privateStore.hasOwnProperty(tableName)) {
                var data = definition.data || [];
                delete definition.data;
                publicApi.setItem(tableName, definition);
                publicApi.setItem(getStoreKey(tableName), data.splice(0));
            } else {
                /**
                 * extend the existing with the new
                 */
                publicApi.setItem(tableName, definition);
            }
        }

        static onDropTable(tbl) {
            publicApi.removeItem(tbl);
            publicApi.removeItem(getStoreKey(tbl));
        }

        static onUpdateTable(tbl, updates) {
            // save the data
            Object.keys(updates).forEach(function (key) {
                _privateStore[tbl][key] = updates[key];
            });
    
            publicApi.setItem(tbl, _privateStore[tbl]);
        }
        static onTruncateTable(tableName){
            this.update(tableName)
        }

        static onResolveSchema(version, tables) {
            publicApi.setItem('version', version);
            Object.keys(tables).forEach(tblName => {
                EventRegistry.onCreateTable(tblName, tables[tblName]);
            });
        }
        static onRenameTable(oldTable, newTable) {
            _privateStore[oldTable].TBL_NAME = newTable;
            publicApi.setItem(newTable, _privateStore[oldTable]);
            publicApi.setItem(getStoreKey(newTable), _privateStore[getStoreKey(oldTable)]);
            publicApi.removeItem(oldTable);
            publicApi.removeItem(getStoreKey(oldTable));
        }

        static onAlterTable(tableName){
            this.update(tableName)
        }

        static onRenameDataBase(oldName, newName, cb) {
            var resource = publicApi.getItem(storageUtils.storeMapping.resourceName);
            Object.keys(resource.resourceManager).forEach(function (tbl) {
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
    }

    /**
     * 
     * @param {*} storeName 
     */
    function getStoreName(storeName) {
        return dbName + ":" + storeName;
    }

    function loadData() {
        Object.values(storageUtils.storeMapping).forEach(v => {
            _privateStore[v] = getItem(v);  
        });

        var resource = _privateStore[storageUtils.storeMapping.resourceName];
        if (resource){
            _privateStore['version'] = getItem('version');
            if (resource.resourceManager) {
                Object.keys(resource.resourceManager).forEach(function (tbl) {
                    _privateStore[tbl] = getItem(tbl);
                    _privateStore[getStoreKey(tbl)] = getItem(getStoreKey(tbl)) || [];
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


    loadData();
    // trigger our callback
    setTimeout(callback);
    return publicApi;
}
/**
 * register default storage adapters
 */
Database.storageAdapter.add(['memory', 'localStorage', 'sessionStorage'], DefaultStorage);