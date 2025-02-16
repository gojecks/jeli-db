/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} CB 
 */
function IndexedDBAdapter(config, storageUtils, CB) {
    var dbName = "_jEliDB_";
    var _storeName = '_jEli_DB_Store_';
    var _version = 1;
    var _db;
    var _privateStore = {};
    var setName = tableName => `${tableName}:data`;

    function createTable(tableName, definition) {
        // create a new store for data
        var data = definition.data || [];
        delete definition.data;
        publicApis.setItem(setName(tableName), data.splice(0));
        publicApis.setItem(tableName, definition);
    }

    function saveData(tableName) {
        publicApis.setItem(setName(tableName), _privateStore[setName(tableName)]);
    }

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

        static clear(callback) {
            _pApis.clearStore(function () {
                _privateStore = {};
                (callback || noop)(true);
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
            var eventFactory = EventRegistry[eventName];
            return eventFactory && eventFactory.apply(null, args);
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

    class EventRegistry {
        static insert(tableName, data, insertData) {
            _privateStore[tableName].lastInsertId += data.length;
            if (insertData) {
                _privateStore[setName(tableName)].push.apply(_privateStore[setName(tableName)], data);
            }
            saveData(tableName);
        }

        static update = saveData;
        static delete = saveData;
        static onAlterTable = saveData;
        static onTruncateTable = saveData;
        static onCreateTable = createTable
        static onDropTable(tbl) {
            publicApis.removeItem(tbl);
            publicApis.removeItem(setName(tbl));
        }
        static onUpdateTable(tbl, updates) {
            Object.keys(updates)
                .forEach(function (key) {
                    _privateStore[tbl][key] = updates[key];
                });
            // set the property to db
            publicApis.setItem(tbl, _privateStore[tbl]);
        }

        static onResolveSchema(version, tables) {
            publicApis.setItem('version', version);
            Object.keys(tables).forEach(function (key) {
                createTable(key, tables[key]);
            });
        }

        static onRenameTable(oldTable, newTable, cb) {
            _privateStore[oldTable].TBL_NAME = newTable;
            publicApis.setItem(newTable, _privateStore[oldTable]);
            publicApis.setItem(setName(newTable), _privateStore[setName(oldTable)]);
            publicApis.removeItem(oldTable);
            publicApis.removeItem(setName(oldTable));
            (cb || noop)();
        }

        static onRenameDataBase(oldName, newName, cb) {
            (cb || noop)();
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
     * @param {string} store_name
     * @param {string} mode either "readonly" or "readwrite"
     */
    function getObjectStore(store_name, mode) {
        var tx = _db.transaction(store_name, mode);
        return tx.objectStore(store_name);
    };


    return publicApis;
}
