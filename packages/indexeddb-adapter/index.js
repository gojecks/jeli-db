/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} CB 
 */
function indexedDBStorage(config, storageUtils, CB) {
    var dbName = "_jEliDB_";
    var _storeName = '_jEli_DB_Store_';
    var _version = 1;
    var _db;
    var _privateStore = {};
    var _eventRegistry = new Map();

    class publicApis {
        /**
     * 
     * @param {*} name 
     * @param {*} item 
     */
        static setItem(name, item) {
            _pApis.addStore(name, item);
        }

        /**
         * 
         * @param {*} name 
         */
        static getItem(name) {
            if (!name) {
                return storageUtils.generateStruct(_privateStore);
            }
            return _privateStore[name];
        };

        /**
         * 
         * @param {*} name 
         */
        static removeItem(name) {
            _pApis.deleteFromStore(name, function () {
                delete _privateStore[name];
            });
        }

        static clear() {
            _pApis.clearStore(function () {
                _privateStore = {};
            });
        }

        /**
         * 
         * @param {*} name 
         */
        static usage(name) {
            return JSON.stringify(this.getItem(name) || '').length;
        }

        static isExists(key) {
            return _privateStore.hasOwnProperty(key);
        }

        static broadcast(eventName, args) {
            if (_eventRegistry.has(eventName)) {
                _eventRegistry.get(eventName).apply(null, args);
            }
        }
    };

    class _pApis {
        static checkStoreName(storeName) {
            return _db.objectStoreNames.contains(storeName);
        }

        static addStore(storeName, data) {
            if (this.checkStoreName(_storeName)) {

                // Use transaction oncomplete to make sure the objectStore creation is 
                // finished before adding data into it.
                var store = getObjectStore(_storeName, "readwrite");
                // Store values in the newly created objectStore.
                store.put({
                    _rev: storeName,
                    _data: data
                });
                // update cache
                _privateStore[storeName] = data;
            }

            return this;
        }

        static deleteFromStore(storeName, CB) {
            try {
                var store = getObjectStore(_storeName, 'readwrite');
                var req = store.delete(storeName);
                req.onsuccess = CB || noop;
            } catch (e) { }
        }

        static clearStore(cb) {
            try {
                var store = getObjectStore(_storeName, 'readwrite');
                var req = store.clear();
                req.onsuccess = cb || noop;
            } catch (e) {

            }
        }

        static getStoreItem(rev, CB) {
            var store = getObjectStore(_storeName, 'readonly'),
                req = store.get(rev);
            req.onsuccess = CB(req);
        }
    }

    /**
     * 
     * @param {*} version 
     * @param {*} onUpgradeneeded 
     */
    function createDB(version, onUpgradeneeded) {
        // set the reference to our latest version
        _version = version || _version;
        var req = window.indexedDB.open(dbName, _version);

        req.onsuccess = function (evt) {
            _db = this.result;
            getAllStoreData((CB || noop))
        };

        req.onerror = function (evt) {
            console.error("jEliDB:indexedDB:Error:", evt.target.errorCode);
        };

        req.onupgradeneeded = onUpgradeneeded || noop;
    }


    // create our DB with the default version
    createDB(config.version, function (ev) {
        var db = ev.target.result;
        // Create an objectStore to hold information . We're
        // going to use "ssn" as our key path because it's guaranteed to be
        // unique - or at least that's what I was told during the kickoff meeting.
        db.createObjectStore(_storeName, { keyPath: "_rev" });
    });


    function getAllStoreData(resolve) {
        var store = getObjectStore(_storeName, "readwrite"),
            req = store.openCursor();

        req.onsuccess = function (evt) {
            var cursor = evt.target.result;
            // If the cursor is pointing at something, ask for the data
            if (cursor) {
                // get our data and append to our local store for quick query
                req = store.get(cursor.key);
                req.onsuccess = function (evt) {
                    var value = evt.target.result;
                    _privateStore[cursor.key] = value._data;
                };

                // Move on to the next object in store
                cursor.continue();

            } else {
                resolve();
            }
        };
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} data 
     * @param {*} insertData 
     */
    function insertEvent(tableName, data, insertData) {
        _privateStore[tableName].lastInsertId += data.length;
        if (insertData) {
            _privateStore[tableName + ":data"].push.apply(_privateStore[tableName + ":data"], data);
        }
        saveData(tableName);
    }

    /**
     * 
     * @param {*} tbl 
     */
    function onDropTableEvent(tbl) {
        publicApis.removeItem(tbl);
        publicApis.removeItem(tbl + ":data");
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} updates 
     */
    function onUpdateTableEvent(tbl, updates) {
        Object.keys(updates)
            .forEach(function (key) {
                _privateStore[tbl][key] = updates[key];
            });
        // set the property to db
        publicApis.setItem(tbl, _privateStore[tbl]);
    }

    /**
     * 
     * @param {*} version 
     * @param {*} tables 
     */
    function onResolveSchemaEvent(version, tables) {
        publicApis.setItem('version', version);
        Object.keys(tables).forEach(function (key) {
            createTable(key, tables[key]);
        });
    }

    /**
     * 
     * @param {*} oldTable 
     * @param {*} newTable 
     * @param {*} cb 
     */
    function onRenameTableEvent(oldTable, newTable, cb) {
        _privateStore[oldTable].TBL_NAME = newTable;
        publicApis.setItem(newTable, _privateStore[oldTable]);
        publicApis.setItem(newTable + ":data", _privateStore[oldTable + ":data"]);
        publicApis.removeItem(oldTable);
        publicApis.removeItem(oldTable + ":data");
        (cb || noop)();
    }

    /**
     * 
     * @param {*} oldName 
     * @param {*} newName 
     * @param {*} cb 
     */
    function onRenameDataBaseEvent(oldName, newName, cb) {
        (cb || noop)();
    }

    function createTable(tableName, definition) {
        // create a new store for data
        publicApis.setItem(tableName + ":data", []);
        publicApis.setItem(tableName, definition);
    }

    function saveData(tableName) {
        publicApis.setItem(tableName + ":data", _privateStore[tableName + ":data"]);
    }

    /**
     * @param {string} store_name
     * @param {string} mode either "readonly" or "readwrite"
     */
    function getObjectStore(store_name, mode) {
        var tx = _db.transaction(store_name, mode);
        return tx.objectStore(store_name);
    }

    _eventRegistry.set('insert', insertEvent);
    _eventRegistry.set('update', saveData);
    _eventRegistry.set('delete', saveData);
    _eventRegistry.set('onAlterTable', saveData);
    _eventRegistry.set('onCreateTable', createTable);
    _eventRegistry.set('onDropTable', onDropTableEvent);
    _eventRegistry.set('onUpdateTable', onUpdateTableEvent);
    _eventRegistry.set('onTruncateTable', saveData);
    _eventRegistry.set('onResolveSchema', onResolveSchemaEvent);
    _eventRegistry.set('onRenameTable', onRenameTableEvent);
    _eventRegistry.set('onRenameDataBase', onRenameDataBaseEvent);


    return publicApis;
}