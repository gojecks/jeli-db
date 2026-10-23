/**
 *
 * @param {*} config
 * @param {*} storageUtils
 * @param {*} CB
 */
function IndexedDBAdapter(config, storageUtils, CB) {
    var LEGACY_DB = '_jEliDB_';
    var STORE = '_jEli_DB_Store_';
    var _db = null;
    var _privateStore = new Map();
    var setName = tableName => `${tableName}:data`;
    var dbNameOf = name => `${LEGACY_DB}:${name}`;
    var noop = () => { };
    var idb = (typeof self !== 'undefined' ? self : window).indexedDB;

    function logError(err) {
        console.error('[JDB INDEXEDDB_ADAPTER]:', err);
    }

    function saveData(tableName) {
        publicApis.setItem(setName(tableName), _privateStore.get(setName(tableName)));
    }

    function tableNames() {
        var resource = _privateStore.get(storageUtils.storeMapping.resourceName);
        return Object.keys((resource && resource.resourceManager) || {}).filter(tbl => _privateStore.has(tbl));
    }

    // resolves with the connection and whether the database was just created
    function openDB(name) {
        return new Promise((resolve, reject) => {
            var created = false;
            var req = idb.open(name, 1);
            req.onupgradeneeded = evt => {
                created = !evt.oldVersion;
                if (!req.result.objectStoreNames.contains(STORE)) {
                    req.result.createObjectStore(STORE, { keyPath: '_rev' });
                }
            };
            req.onsuccess = () => {
                req.result.onversionchange = () => req.result.close();
                resolve({ db: req.result, created: created });
            };
            req.onerror = () => reject(req.error);
        });
    }

    function readAll(db) {
        return new Promise((resolve, reject) => {
            var entries = [];
            var req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
            req.onsuccess = () => {
                var cursor = req.result;
                if (!cursor) return resolve(entries);
                entries.push([cursor.key, cursor.value._data]);
                cursor.continue();
            };
            req.onerror = () => reject(req.error);
        });
    }

    function writeAll(db, entries) {
        return new Promise((resolve, reject) => {
            var tx = db.transaction(STORE, 'readwrite');
            var store = tx.objectStore(STORE);
            entries.forEach(entry => store.put({ _rev: entry[0], _data: entry[1] }));
            tx.oncomplete = () => resolve();
            tx.onabort = () => reject(tx.error);
        });
    }

    // without a connection the adapter keeps working in memory
    function withStore(action) {
        if (!_db) return null;
        try {
            var tx = _db.transaction(STORE, 'readwrite');
            tx.onabort = () => logError(tx.error);
            action(tx.objectStore(STORE));
            return tx;
        } catch (err) {
            logError(err);
            return null;
        }
    }

    // databases used to share one "_jEliDB_"; copy this database's records out of it
    async function readLegacy() {
        var legacy = await openDB(LEGACY_DB);
        if (legacy.created) {
            legacy.db.close();
            idb.deleteDatabase(LEGACY_DB);
            return [];
        }

        var entries = new Map(await readAll(legacy.db));
        legacy.db.close();
        var resource = entries.get(storageUtils.storeMapping.resourceName);
        var keys = ['version'].concat(Object.values(storageUtils.storeMapping));
        Object.keys((resource && resource.resourceManager) || {}).forEach(tbl => keys.push(tbl, setName(tbl)));
        return keys.filter(key => entries.has(key)).map(key => [key, entries.get(key)]);
    }

    async function initialize() {
        try {
            var opened = await openDB(dbNameOf(config.name));
            _db = opened.db;
            if (opened.created) {
                await writeAll(_db, await readLegacy());
            }

            (await readAll(_db)).forEach(entry => _privateStore.set(entry[0], entry[1]));
        } catch (err) {
            logError(err);
        }

        (CB || noop)();
    }

    class publicApis {
        static setItem(name, item) {
            _privateStore.set(name, item);
            withStore(store => store.put({ _rev: name, _data: item }));
        }

        static getItem(name) {
            if (!name) {
                return storageUtils.generateStruct(_privateStore);
            }

            return _privateStore.get(name);
        }

        static removeItem(name) {
            _privateStore.delete(name);
            withStore(store => store.delete(name));
        }

        static clear(callback) {
            callback = callback || noop;
            _privateStore.clear();
            var tx = withStore(store => store.clear());
            if (!tx) return callback(!_db);
            tx.oncomplete = () => callback(true);
            tx.onabort = () => {
                logError(tx.error);
                callback(false);
            };
        }

        static usage() {
            return JSON.stringify(Array.from(_privateStore.values())).length;
        }

        static isExists(key) {
            return _privateStore.has(key);
        }

        static broadcast(eventName, args) {
            var eventFactory = EventRegistry[eventName];
            return eventFactory && eventFactory.apply(EventRegistry, args);
        }
    }

    class EventRegistry {
        static insert(tableName, data, insertData) {
            _privateStore.get(tableName).lastInsertId += data.length;
            if (insertData) {
                var rows = _privateStore.get(setName(tableName));
                data.forEach(row => rows.push(row));
            }
            saveData(tableName);
        }

        static update = saveData;
        static delete = saveData;
        static onAlterTable = saveData;

        static onTruncateTable(tableName) {
            _privateStore.get(setName(tableName)).length = 0;
            saveData(tableName);
        }

        // an existing table keeps its rows, like DefaultStorage
        static onCreateTable(tableName, definition) {
            var data = definition.data || [];
            delete definition.data;
            if (!_privateStore.has(tableName) || !_privateStore.has(setName(tableName))) {
                publicApis.setItem(setName(tableName), data.splice(0));
            }
            publicApis.setItem(tableName, definition);
        }

        static onDropTable(tbl) {
            publicApis.removeItem(tbl);
            publicApis.removeItem(setName(tbl));
        }

        static onUpdateTable(tbl, updates) {
            Object.assign(_privateStore.get(tbl), updates);
            publicApis.setItem(tbl, _privateStore.get(tbl));
        }

        static onResolveSchema(version, tables) {
            publicApis.setItem('version', version);
            Object.keys(tables).forEach(key => EventRegistry.onCreateTable(key, tables[key]));
        }

        static onRenameTable(oldTable, newTable, cb) {
            _privateStore.get(oldTable).TBL_NAME = newTable;
            publicApis.setItem(newTable, _privateStore.get(oldTable));
            publicApis.setItem(setName(newTable), _privateStore.get(setName(oldTable)));
            publicApis.removeItem(oldTable);
            publicApis.removeItem(setName(oldTable));
            (cb || noop)();
        }

        // copies everything into the new database, then deletes the old one
        static onRenameDataBase(oldName, newName, cb) {
            tableNames().forEach(tbl => Object.assign(_privateStore.get(tbl), { DB_NAME: newName, lastModified: +new Date }));
            if (!_db) {
                config.name = newName;
                return (cb || noop)();
            }

            openDB(dbNameOf(newName))
                .then(opened => writeAll(opened.db, Array.from(_privateStore)).then(() => {
                    if (_db) _db.close();
                    _db = opened.db;
                    config.name = newName;
                    idb.deleteDatabase(dbNameOf(oldName));
                    (cb || noop)();
                }))
                .catch(err => logError(err));
        }
    }

    initialize();
    return publicApis;
}
