/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} next 
 * @returns 
 */
function SqlAdapter(config, storageUtils, next) {
    var _sqlFacade = null;
    var _privateStore = {};
    var _errorTables = [];
    var type = null;
    var getDataName = collection => `${collection}:data`;

    class StorageFacade {
        /**
         *
         * @param {*} name
         */
        static usage(name) {
            return JSON.stringify(StorageFacade.getItem(name) || '').length;
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
        }

        /**
         *
         * @param {*} name
         * @param {*} item
         */
        static setItem(name, item) {
            _privateStore[name] = item;
            _sqlFacade.query('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)', [name, JSON.stringify(item)]);
        }

        static removeItem(name) {
            _sqlFacade.query('DELETE FROM _JELI_STORE_ WHERE _rev=?', [name])
                .then(function () {
                    delete _privateStore[name];
                });

            return true;
        }

        static clear(onDone) {
            onDone = onDone || noop;
            _sqlFacade.query('DELETE FROM _JELI_STORE_', [])
                .then(() => {
                    // empty data
                    _privateStore = {};
                    // onDone
                    onDone(true);
                }, () => onDone(false));
        }

        static isExists(key) {
            return _privateStore.hasOwnProperty(key);
        }

        static broadcast(eventName, args) {
            var eventCallback = EventRegistry[eventName];
            eventCallback && eventCallback.apply(null, args);
        }

        static initialize() {
            _sqlFacade = CoreSqlFacade.createInstance(config);
            function loadAllData() {
                _sqlFacade.query('SELECT * FROM _JELI_STORE_', [])
                    .then(function (tx, results) {
                        var len = results.rows.length;
                        for (var i = 0; i < len; i++) {
                            _privateStore[results.rows.item(i)._rev] = JSON.parse(results.rows.item(i)._data);
                        }

                        loadDBData();
                    }, logError);
            }

            function loadDBData() {
                var resource = _privateStore[storageUtils.storeMapping.resourceName];
                var tableNames = Object.keys((resource || {}).resourceManager || {});
                if (!_privateStore.version || !tableNames.length)
                    return (next || noop)();

                resolveTableData();

                function resolveTableData() {
                    if (!tableNames.length)
                        return (next || noop)();

                    var current = tableNames.shift();
                    var columns = StorageFacade.getItem(current).columns[0];
                    var columnNames = Object.keys(columns || {});

                    _privateStore[getDataName(current)] = [];
                    /**
                     * check if table has data before querying database
                     */
                    var MAXIMUM_RESULT = 1000,
                        TOTAL_RECORDS = _privateStore[current]._records || 0,
                        chunkQueries = [];
                    if (TOTAL_RECORDS > 0) {
                        /**
                         * chunk query
                         */
                        if (TOTAL_RECORDS > MAXIMUM_RESULT) {
                            console.log('[JDB SQL_ADAPTER]: preparing chunking of table ' + current);
                            for (var i = 0; i <= TOTAL_RECORDS; i += MAXIMUM_RESULT) {
                                chunkQueries.push([i, MAXIMUM_RESULT])
                            }
                            startChunkQuery();
                        } else {
                            _sqlFacade.select('select * from ' + current)
                                .then(success, error);
                        }

                    } else {
                        resolveTableData();
                    }

                    /**
                     * 
                     * @param {*} tx 
                     * @param {*} results 
                     */
                    function success(tx, results) {
                        var len = results.rows.length;
                        for (var i = 0; i < len; i++) {
                            var data = ({
                                _ref: results.rows.item(i)._ref,
                                _data: columnNames.reduce((accum, key) => {
                                    accum[key] = jsonParserTypes(results.rows.item(i)[key]);
                                    return accum;
                                }, {})
                            });

                            // store the data
                            _privateStore[getDataName(current)].push(data);
                        }

                        nextQuery();
                    }

                    function startChunkQuery() {
                        var query = chunkQueries.shift()
                        _sqlFacade.select('select * from ' + current + ' limit ?,?', query)
                            .then(success, function (err) {
                                chunkQueries.push(query);
                                error(err);
                            });
                    }

                    function nextQuery() {
                        if (chunkQueries.length) {
                            startChunkQuery();
                        } else {
                            // loadNextData
                            resolveTableData();
                        }
                    }

                    /**
                     * 
                     * @param {*} err 
                     */
                    function error(err) {
                        console.log('[JDB SQL_ADAPTER]: failed to load:', current);
                        _errorTables.push(current);
                        nextQuery();
                    }
                }
            }

            // create our store table
            _sqlFacade
                .query('CREATE TABLE IF NOT EXISTS _JELI_STORE_ (_rev unique, _data)', [])
                .then(loadAllData, function () {
                    throw new Error(type + " failed to initialize our store");
                });

            return StorageFacade;
        }
    }


    class EventRegistry {

        static insert(tbl, data, insertData) {
            _privateStore[tbl].lastInsertId += data.length;
            if (insertData) {
                _privateStore[getDataName(tbl)].push.apply(_privateStore[getDataName(tbl)], data);
            }

            _sqlFacade.insert(tbl, data);
        }

        static update(tbl, data) {
            _sqlFacade.update(tbl, data)
                .then(function () { }, logError);
        }

        static delete(tbl, delItem) {
            /**
             * remove the data from memory
             */
            _sqlFacade.delete(tbl, delItem, " WHERE _ref=?", '_ref')
                .then(function () { }, logError);
        }

        static onAlterTable(tableName, columnName, action) {
            var columnData = "";
            _sqlFacade.alterTable.apply(_sqlFacade, arguments)
                .then(function () {
                    if (action) {
                        var tblData = _privateStore[getDataName(tableName)];
                        if (tblData.length) {
                            var columnData = tblData[0]._data[columnName];
                        }
                    }

                    updateTable(columnData);
                }, handleAlterError);
            /**
             * update a table when these actions are performed DROP | RENAME | ADD
             */
            function updateTable() {
                _sqlFacade.query('update ' + tableName + ' set ' + columnName + '=?', [columnData])
            }

            /**
             * Below method helps to tackle issues with Sqlite lower version without support for 
             * RENAME and DROP COLUMN
             */
            function handleAlterError() {
                // failure should be either for DROP and RENAME
                if (typeof columnName === 'object') {
                    // rename mode
                    _sqlFacade.alterTable(tableName, columnName[1], 1);
                } else {
                    // drop
                    if (!action) {
                        updateTable();
                    }
                }
            }
        }

        static onCreateTable(tbl, definition) {
            var columns = ['_ref unique'];
            if (definition.columns[0]) {
                columns = columns.concat(Object.keys(definition.columns[0]));
            }

            _sqlFacade.createTable(tbl, columns);
            var data = definition.data || [];
            delete definition.data;
            StorageFacade.setItem(tbl, definition);
            _privateStore[getDataName(tbl)] = data;
            EventRegistry.insert(tbl, data.splice(0), true);
        }

        static onDropTable(tbl) {
            _sqlFacade.dropTable(tbl)
                .then(function () {
                    StorageFacade.removeItem(tbl);
                    StorageFacade.removeItem(getDataName(tbl));
                });
        }

        static onUpdateTable(tbl, updates) {
            Object.keys(updates)
                .forEach(function (key) {
                    _privateStore[tbl][key] = updates[key];
                });
            // set the property to db
            StorageFacade.setItem(tbl, _privateStore[tbl]);
        }

        static onTruncateTable(tableName) {
            _privateStore[getDataName(tableName)].length = 0;
            return _sqlFacade.delete.apply(_sqlFacade, arguments);
        };

        static onResolveSchema(version, tables) {
            StorageFacade.setItem('version', version);
            Object.keys(tables).forEach(function (tblName) {
                EventRegistry.onCreateTable(tblName, tables[tblName]);
            });
        }

        static onRenameTable(oldTable, newTable) {
            // rename cache first
            _privateStore[newTable] = _privateStore[oldTable];
            _privateStore[newTable].TBL_NAME = newTable;
            _privateStore[getDataName(newTable)] = _privateStore[getDataName(oldTable)];
            delete _privateStore[getDataName(oldTable)];
            delete _privateStore[oldTable];

            _sqlFacade.query('update _JELI_STORE_ set _rev=? where _rev=?', [newTable, oldTable]);
            _sqlFacade.query('ALTER TABLE ' + oldTable + ' RENAME TO ' + newTable, []);
        }

        static onRenameDataBase(oldName, newName, cb) {
            var newData = deepClone(_privateStore[oldName], true),
                tbls = ['_JELI_STORE_'],
                tblInstance = Object.keys(newData.tables);
            /**
             * loop through tables
             * store each table Data
             */
            tblInstance.forEach(tblName => {
                newData.tables[tblName].DB_NAME = newName;
                newData.tables[tblName].lastModified = +new Date
                tbls.push(tblName);
            });

            var bkInstance = CoreSqlFacade.createInstance(extend(config, { name: newName }));
            _sqlFacade.dropTables(tbls);
            /**
             * create our store
             */
            bkInstance.createTable('_JELI_STORE_', ['_rev unique', '_data'])
                .then(function () {
                    /**
                     * insert into our store
                     */
                    bkInstance.insert('_JELI_STORE_', [{
                        _rev: newName,
                        _data: newData
                    }, {
                        _rev: storageUtils.storeMapping.resourceName,
                        _data: StorageFacade.getItem(storageUtils.storeMapping.resourceName)
                    }, {
                        _rev: storageUtils.storeMapping.pendingSync,
                        _data: StorageFacade.getItem(storageUtils.storeMapping.pendingSync)
                    }])
                        .then(function () {
                            tblInstance.each(createAndInsert);
                            StorageFacade.clear(callback);
                        });
                });

            function createAndInsert(tblName) {
                bkInstance.createTable(tblName, ['_ref unique', '_data'])
                    .then(function () {
                        bkInstance.insert(tblName, _privateStore[getDataName(tblName)])
                    });
            }
        }
    }


    return StorageFacade.initialize();
}