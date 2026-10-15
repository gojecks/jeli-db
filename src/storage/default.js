/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} callback 
 */
function DefaultStorage(config, storageUtils, callback) {
    'use strict';
    const dbName = config.name;
    let   _privateStore = new Map();
    const _hasStorage = (self && !!self[config.type]);
    const _storageName = config.type;
    const getStoreKey = key => `${key}:data`;
    const _recovery = `__recovery:${dbName}__`;

    if(!_hasStorage){
        // save file so they can be retrieved on reload
        let persisted = false;
        const persistForRecovery = () => {
            if(persisted) return;
            localStorage.setItem(_recovery, JSON.stringify(Array.from(_privateStore)))
            persisted = true;
        };

        // attach eventListener
        document.addEventListener('visibilitychange', persistForRecovery);
        window.addEventListener('pagehide', persistForRecovery);
    }

    class publicApi {
        static setItem(name, value) {
            var jsonValue = JSON.stringify(value);
            var filesizeCheck = Math.floor((((jsonValue.length) * 2) / 1024).toFixed(2));
            if (filesizeCheck >= (1024 * 10)) {
                privateApi.getConfigData('logService')("_privateStore_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
                return;
            }

            // save the item;
            _privateStore.set(name, value);
            /**
             * support for session && localStorage
             */
            if (name && _hasStorage) {
                self[_storageName][getStoreName(name)] = jsonValue;
            }
        }

        static getItem(name) {
            if (!name) {
                return storageUtils.generateStruct(_privateStore);
            }

            return _privateStore.get(name);
        }

        static removeItem(name) {
            _privateStore.delete(name);
            if (_hasStorage) {
                self[_storageName].removeItem(getStoreName(name));
            }
        }

        static clear(callback) {
            if (_hasStorage) {
                self[_storageName].clear();
            }

            _privateStore.clear();
            callback(true)
        }

        static usage(name) {
            return JSON.stringify(Array.from(_privateStore.values())).length;
        }

        static isExists(name) {
            return _privateStore.has(name);
        }

        static broadcast(eventName, args) {
            EventRegistry._call(eventName, args);
        }
    };

    class EventRegistry {
        static _call(eventName, args) {
            if (this[eventName]) {
                this[eventName].apply(EventRegistry, args);
            }
        }

        static insert(tableName, data, insertData) {
            if (insertData) {
                const storeData = _privateStore.get(getStoreKey(tableName));
                storeData.push.apply(storeData, data);
            }

            _privateStore.get(tableName).lastInsertId += data.length;
            this.update(tableName);
        }

        static update(tbl) {
            const storeKey = getStoreKey(tbl);
            publicApi.setItem(storeKey, _privateStore.get(storeKey));
        }

        static delete(tableName, delItem) {
            // remove the data
            this.update(tableName);
        }

        static onCreateTable(tableName, definition) {
            /**
             * we only set data property if its a new table and not exists
             */
            if (!_privateStore.has(tableName)) {
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
                _privateStore.get(tbl)[key] = updates[key];
            });

            publicApi.setItem(tbl, _privateStore.get(tbl));
        }
        static onTruncateTable(tableName) {
            // empty the record
            _privateStore.set(getStoreKey(tableName), []);
            this.update(tableName)
        }

        static onResolveSchema(version, tables) {
            publicApi.setItem('version', version);
            Object.keys(tables).forEach(tblName => {
                EventRegistry.onCreateTable(tblName, tables[tblName]);
            });
        }
        static onRenameTable(oldTable, newTable) {
            _privateStore.get(oldTable).TBL_NAME = newTable;
            publicApi.setItem(newTable, _privateStore.get(oldTable));
            publicApi.setItem(getStoreKey(newTable), _privateStore.get(getStoreKey(oldTable)));
            publicApi.removeItem(oldTable);
            publicApi.removeItem(getStoreKey(oldTable));
        }

        static onAlterTable(tableName) {
            this.update(tableName)
        }

        static onRenameDataBase(oldName, newName, cb) {
            var resource = publicApi.getItem(storageUtils.storeMapping.resourceName);
            Object.keys(resource.resourceManager).forEach(function (tbl) {
                Object.assign(_privateStore.get(tbl), { DB_NAME: newName, astModified: +new Date })
            });

            const propertyNames = Array.from(_privateStore.keys());
            for (const name of propertyNames) {
                const data = publicApi.getItem(name);
                dbName = oldName;
                publicApi.removeItem(name);
                dbName = newName;
                publicApi.setItem(name, data);
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
        if(!_hasStorage) {
            const recoveryData = localStorage.getItem(_recovery);
            localStorage.removeItem( _recovery );
            if(recoveryData){
                // register the new entry
                _privateStore = new Map( JSON.parse(recoveryData) );
            }
        } else {
            Object.values(storageUtils.storeMapping).forEach(v => {
                _privateStore.set(v, getItem(v));
            });

            const resource = _privateStore.get(storageUtils.storeMapping.resourceName);
            if (resource) {
                _privateStore.set('version', getItem('version'));
                if (resource.resourceManager) {
                    Object.keys(resource.resourceManager).forEach(function (tbl) {
                        _privateStore.set(tbl, getItem(tbl));
                        _privateStore.set(getStoreKey(tbl), getItem(getStoreKey(tbl)) || []);
                    });
                }
            }
        }
    }

    function getItem(name) {
        name = getStoreName(name);
        if (_hasStorage) {
            const record = self[_storageName].getItem(name);
            return JSON.parse(record || false);
        }
        // memeory support
        return _privateStore.get(name);
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