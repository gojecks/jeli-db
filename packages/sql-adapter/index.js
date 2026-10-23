/**
 *
 * @param {*} config
 * @param {*} storageUtils
 * @param {*} next
 * @returns
 */
function SqlAdapter(config, storageUtils, next) {
    var _sqlFacade = null;
    var _privateStore = new Map();
    var _errorTables = [];
    var STORE_TABLE = '_JELI_STORE_';
    var PAGE_SIZE = 1000;
    var getDataName = collection => `${collection}:data`;
    var getColumns = definition => Object.keys(((definition && definition.columns) || [])[0] || {});
    var storeSql = (name, item) => ['INSERT OR REPLACE INTO "' + STORE_TABLE + '" ("_rev", "_data") VALUES (?,?)', [name, JSON.stringify(item)]];

    class StorageFacade {
        static usage() {
            return JSON.stringify(Array.from(_privateStore.values())).length;
        }

        /**
         *
         * @param {*} name
         */
        static getItem(name) {
            if (!name) {
                return storageUtils.generateStruct(_privateStore);
            }

            return _privateStore.get(name);
        }

        /**
         *
         * @param {*} name
         * @param {*} item
         */
        static setItem(name, item) {
            _privateStore.set(name, item);
            _sqlFacade.query.apply(_sqlFacade, storeSql(name, item)).catch(logError);
        }

        static removeItem(name) {
            _privateStore.delete(name);
            _sqlFacade.query('DELETE FROM "' + STORE_TABLE + '" WHERE "_rev"=?', [name]).catch(logError);
            return true;
        }

        static clear(onDone) {
            onDone = onDone || noop;
            var tables = StorageFacade.tableNames();
            _privateStore.clear();
            _sqlFacade.dropTables(tables)
                .then(() => _sqlFacade.query('DELETE FROM "' + STORE_TABLE + '"'))
                .then(() => onDone(true), err => {
                    logError(err);
                    onDone(false);
                });
        }

        static isExists(key) {
            return _privateStore.has(key);
        }

        static broadcast(eventName, args) {
            var eventCallback = EventRegistry[eventName];
            return eventCallback && eventCallback.apply(EventRegistry, args);
        }

        static tableNames() {
            var resource = _privateStore.get(storageUtils.storeMapping.resourceName);
            return Object.keys((resource && resource.resourceManager) || {}).filter(tbl => _privateStore.has(tbl));
        }

        static async loadTable(tbl) {
            var columnNames = getColumns(_privateStore.get(tbl));
            var rows = [];
            _privateStore.set(getDataName(tbl), rows);
            for (var offset = 0; ; offset += PAGE_SIZE) {
                var results = await _sqlFacade.select(tbl, PAGE_SIZE, offset);
                for (var i = 0; i < results.rows.length; i++) {
                    var row = results.rows.item(i);
                    rows.push(columnNames.reduce((accum, key) => {
                        accum[key] = jsonParserTypes(row[key]);
                        return accum;
                    }, { _id: row._ref }));
                }

                if (results.rows.length < PAGE_SIZE) return;
            }
        }

        static async initialize() {
            _sqlFacade = CoreSqlFacade.createInstance(config);
            try {
                await _sqlFacade.createTable(STORE_TABLE, '_rev', ['_data']);
                var results = await _sqlFacade.query('SELECT * FROM "' + STORE_TABLE + '"');
                for (var i = 0; i < results.rows.length; i++) {
                    _privateStore.set(results.rows.item(i)._rev, jsonParserTypes(results.rows.item(i)._data));
                }

                if (_privateStore.get('version')) {
                    for (var tbl of StorageFacade.tableNames()) {
                        await StorageFacade.loadTable(tbl).catch(err => {
                            console.log('[JDB SQL_ADAPTER]: failed to load:', tbl);
                            _errorTables.push(tbl);
                            logError(err);
                        });
                    }
                }
            } catch (err) {
                // open in memory rather than leave the database hanging
                console.error('[JDB SQL_ADAPTER]: failed to initialize the store', err);
            }

            (next || noop)();
        }
    }


    class EventRegistry {
        static insert(tbl, data, insertData) {
            _privateStore.get(tbl).lastInsertId += data.length;
            if (insertData) {
                var rows = _privateStore.get(getDataName(tbl));
                data.forEach(row => rows.push(row));
            }

            _sqlFacade.insert(tbl, data).then(logFailures, logError);
        }

        // writes the whole in-memory row, the broadcast only carries the changed fields
        static update(tbl, data) {
            var refs = new Set(data.map(CoreSqlFacade.refOf));
            var rows = (_privateStore.get(getDataName(tbl)) || []).filter(row => refs.delete(CoreSqlFacade.refOf(row)));
            _sqlFacade.update(tbl, rows.concat(data.filter(row => refs.has(CoreSqlFacade.refOf(row))))).then(logFailures, logError);
        }

        static delete(tbl, refs) {
            _sqlFacade.delete(tbl, refs).then(logFailures, logError);
        }

        /**
         * action 1 adds columnName, 0 drops it, or renames when columnName is [old, new]
         */
        static onAlterTable(tableName, columnName, action) {
            if (Array.isArray(columnName)) {
                _sqlFacade.renameColumn(tableName, columnName[0], columnName[1]).catch(logError);
            } else if (action) {
                var rows = _privateStore.get(getDataName(tableName)) || [];
                _sqlFacade.addColumns(tableName, [columnName]).catch(logError);
                _sqlFacade.update(tableName, rows.map(row => ({ _ref: CoreSqlFacade.refOf(row), _data: { [columnName]: (row._data || row)[columnName] } })))
                    .then(logFailures, logError);
            } else {
                _sqlFacade.dropColumn(tableName, columnName).catch(logError);
            }
        }

        // an existing table keeps its rows, like DefaultStorage
        static onCreateTable(tbl, definition) {
            var exists = _privateStore.has(tbl);
            var data = definition.data || [];
            var columns = getColumns(definition);
            delete definition.data;

            _sqlFacade.createTable(tbl, '_ref', columns).catch(logError);
            if (exists) {
                _sqlFacade.addColumns(tbl, columns).catch(logError);
            }

            StorageFacade.setItem(tbl, definition);
            if (!exists || !_privateStore.has(getDataName(tbl))) {
                _privateStore.set(getDataName(tbl), data.splice(0));
                _sqlFacade.insert(tbl, _privateStore.get(getDataName(tbl))).then(logFailures, logError);
            }
        }

        static onDropTable(tbl) {
            StorageFacade.removeItem(tbl);
            _privateStore.delete(getDataName(tbl));
            _sqlFacade.dropTables([tbl]).then(logFailures, logError);
        }

        static onUpdateTable(tbl, updates) {
            Object.assign(_privateStore.get(tbl), updates);
            StorageFacade.setItem(tbl, _privateStore.get(tbl));
        }

        static onTruncateTable(tableName) {
            var rows = _privateStore.get(getDataName(tableName));
            if (rows) rows.length = 0;
            _sqlFacade.truncate(tableName).catch(logError);
        }

        static onResolveSchema(version, tables) {
            StorageFacade.setItem('version', version);
            Object.keys(tables).forEach(function (tblName) {
                EventRegistry.onCreateTable(tblName, tables[tblName]);
            });
        }

        static onRenameTable(oldTable, newTable) {
            var definition = _privateStore.get(oldTable);
            definition.TBL_NAME = newTable;
            _privateStore.set(getDataName(newTable), _privateStore.get(getDataName(oldTable)));
            _privateStore.delete(getDataName(oldTable));
            _sqlFacade.renameTable(oldTable, newTable).catch(logError);
            StorageFacade.setItem(newTable, definition);
            StorageFacade.removeItem(oldTable);
        }

        // copies everything into <newName>.db, then drops the old tables
        static onRenameDataBase(oldName, newName, cb) {
            var target = CoreSqlFacade.createInstance(Object.assign({}, config, { name: newName }));
            var tables = StorageFacade.tableNames();
            var statements = [CoreSqlFacade.createTableSql(STORE_TABLE, '_rev', ['_data'])];

            tables.forEach(tbl => Object.assign(_privateStore.get(tbl), { DB_NAME: newName, lastModified: +new Date }));
            _privateStore.forEach((item, name) => {
                if (!tables.some(tbl => name === getDataName(tbl))) {
                    statements.push(storeSql(name, item));
                }
            });
            tables.forEach(tbl => {
                statements.push(CoreSqlFacade.createTableSql(tbl, '_ref', getColumns(_privateStore.get(tbl))));
                _privateStore.get(getDataName(tbl)).forEach(row => statements.push(CoreSqlFacade.insertSql(tbl, row)));
            });

            target.execute(statements)
                .then(res => {
                    if (res.errors.length) return Promise.reject(res.errors);
                    var source = _sqlFacade;
                    _sqlFacade = target;
                    config.name = newName;
                    source.dropTables(tables.concat([STORE_TABLE])).catch(logError);
                    (cb || noop)();
                })
                .catch(err => {
                    console.error('[JDB SQL_ADAPTER]: failed to rename ' + oldName + ' to ' + newName, err);
                });
        }
    }

    function logFailures(res) {
        if (res.errors.length) logError(res.errors);
    }

    StorageFacade.initialize();
    return StorageFacade;
}
