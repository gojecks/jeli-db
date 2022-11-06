/**
 * 
 * @param {*} data 
 */
function deepClone(data) {
    return JSON.parse(JSON.stringify(data));
}

/**
 * 
 * @param {*} data 
 */
function isArray(data) {
    return toString.call(data) === "[object Array]";
}

/**
 * 
 * @param {*} $dbName 
 * @param {*} options 
 */
function createDB(options) {
    /**
     * check if name contains .db ext
     */
    options.name = options.name + ".db";
    if (window.sqlitePlugin) {
        return window.sqlitePlugin.openDatabase(options);
    } else if (window.openDatabase) {
        return window.openDatabase(options.name, options.version || 1, options.name + ' Storage for webSql', 50 * 1024 * 1024)
    }

    return null;
}

/**
 * 
 * @param {*} config 
 * @param {*} storageUtils 
 * @param {*} CB 
 */
function dbInit(config, storageUtils, CB) {
    dbName = config.name;
    _sqlFacade = new CoreSqlFacade(createDB(config));
    var _storageFacade = new StorageFacade(storageUtils.generateStruct);

    function loadAllData() {
        _sqlFacade.query('SELECT * FROM _JELI_STORE_', [])
            .then(function(tx, results) {
                var len = results.rows.length,
                    i;
                for (i = 0; i < len; i++) {
                    _privateStore[results.rows.item(i)._rev] = JSON.parse(results.rows.item(i)._data);
                }

                loadDBData();
            }, txError);
    }

    function loadDBData() {
        if (!_privateStore.version) {
            (CB || noop)();
            return;
        }
        var tableNames = Object.keys(_privateStore[storageUtils.storeMapping.resourceName].resourceManager);

        resolveTableData();

        function resolveTableData() {
            if (!tableNames.length) {
                // trigger our callback
                (CB || noop)();
                return;
            }
            var current = tableNames.shift();
            _privateStore[current + ":data"] = [];
            /**
             * check if table has data before querying database
             */
            var MAXIMUM_RESULT = 1000,
                TOTAL_RECORDS = _privateStore[current].lastInsertId,
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
                var len = results.rows.length,
                    i;
                for (i = 0; i < len; i++) {
                    var data = ({
                            _ref: results.rows.item(i)._ref,
                            _data: {}
                        }),
                        columns = _storageFacade.getItem(current).columns[0],
                        jsonParserTypes = ['object', 'array', 'boolean'];
                    Object.keys(columns)
                        .forEach(function(key) {
                            var value = results.rows.item(i)[key];
                            // is OBJECT or ARRAY
                            if (value &&
                                typeof value === "string" &&
                                (
                                    jsonParserTypes.indexOf(columns[key].type.toLowerCase()) > -1
                                )
                            ) {
                                value = JSON.parse(value);
                            }

                            data._data[key] = value;
                        });
                    _privateStore[current + ":data"].push(data);
                }

                nextQuery();
            }

            function startChunkQuery() {
                var query = chunkQueries.shift()
                _sqlFacade.select('select * from ' + current + ' limit ?,?', query)
                    .then(success, function(err) {
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

    /**
     * 
     * @param {*} tbl 
     * @param {*} definition 
     */
    function createTable(tbl, definition) {
        var columns = ['_ref unique'];
        if (definition.columns[0]) {
            columns = columns.concat(Object.keys(definition.columns[0]));
        }
        _sqlFacade.createTable(tbl, columns);
        _storageFacade.setItem(tbl, definition);
        _privateStore[tbl + ":data"] = [];
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} data 
     * @param {*} insertData 
     */
    function insertEvent(tbl, data, insertData) {
        _privateStore[tbl].lastInsertId += data.length;
        if (insertData) {
            _privateStore[tbl + ":data"].push.apply(_privateStore[tbl + ":data"], data);
        }

        _sqlFacade.insert(tbl, data);
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} columnName 
     * @param {*} action 
     */
    function onAlterTableEvent(tableName, columnName, action) {
        var columnData = "";
        _sqlFacade.alterTable.apply(_sqlFacade, arguments)
            .then(function() {
                if (action) {
                    var tblData = _privateStore[tableName + ":data"];
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

    /**
     * 
     * @param {*} tbl 
     * @param {*} data 
     */
    function onUpdateEvent(tbl, data) {
        _sqlFacade.update(tbl, data)
            .then(function() {}, txError);
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} delItem 
     */
    function onDeleteEvent(tbl, delItem) {
        /**
         * remove the data from memory
         */
        _sqlFacade.delete(tbl, delItem, " WHERE _ref=?", '_ref')
            .then(function() {}, txError);
    }

    /**
     * 
     * @param {*} tbl 
     */
    function onDropTableEvent(tbl) {
        _sqlFacade.dropTable(tbl)
            .then(function() {
                _storageFacade.removeItem(tbl);
                _storageFacade.removeItem(tbl + ":data");
            });
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} updates 
     */
    function onUpdateTableEvent(tbl, updates) {
        Object.keys(updates)
            .forEach(function(key) {
                _privateStore[tbl][key] = updates[key];
            });
        // set the property to db
        _storageFacade.setItem(tbl, _privateStore[tbl]);
    }

    /**
     * 
     * @param {*} version 
     * @param {*} tables 
     */
    function onResolveSchemaEvent(version, tables) {
        _storageFacade.setItem('version', version);
        Object.keys(tables).forEach(function(tblName) {
            createTable(tblName, tables[tblName]);
        });
    }

    function onRenameTableEvent(oldTable, newTable) {
        // rename cache first
        _privateStore[newTable] = _privateStore[oldTable];
        _privateStore[newTable].TBL_NAME = newTable;
        _privateStore[newTable + ":data"] = _privateStore[oldTable + ":data"];
        delete _privateStore[oldTable + ":data"];
        delete _privateStore[oldTable];

        _sqlFacade.query('update _JELI_STORE_ set _rev=? where _rev=?', [newTable, oldTable]);
        _sqlFacade.query('ALTER TABLE ' + oldTable + ' RENAME TO ' + newTable, []);
    }

    /**
     * 
     * @param {*} oldName 
     * @param {*} newName 
     * @param {*} cb 
     */
    function onRenameDataBaseEvent(oldName, newName, cb) {
        var newData = deepClone(_privateStore[oldName], true),
            tablesData = {},
            tbls = ['_JELI_STORE_'],
            _self = this,
            tblInstance = Object.keys(newData.tables);
        /**
         * loop through tables
         * store each table Data
         */
        tblInstance.forEach(function(tblName) {
            newData.tables[tblName].DB_NAME = newName;
            tablesData[tblName] = newData.tables[tblName].data.slice();
            newData.tables[tblName].data = [];
            newData.tables[tblName].lastModified = +new Date
            tbls.push(tblName);
        });
        var bkInstance = useDB(createDB(newName, extend(config, { name: newName })));
        _sqlFacade.dropTables(tbls);
        /**
         * create our store
         */
        bkInstance.createTable('_JELI_STORE_', ["_rev unique", "_data"])
            .then(function() {
                /**
                 * insert into our store
                 */
                bkInstance.insert('_JELI_STORE_', [{
                        _rev: newName,
                        _data: newData
                    }, {
                        _rev: storageUtils.storeMapping.resourceName,
                        _data: _self.getItem(storageUtils.storeMapping.resourceName)
                    }, {
                        _rev: storageUtils.storeMapping.pendingSync,
                        _data: _self.getItem(storageUtils.storeMapping.pendingSync)
                    }])
                    .then(function() {
                        tblInstance.each(createAndInsert);
                        (cb || noop)();
                        _self.clear();
                    });
            });

        function createAndInsert(tblName) {
            bkInstance.createTable(tblName, ['_ref unique', '_data'])
                .then(function() {
                    bkInstance.insert(tblName, tablesData[tblName])
                    delete tablesData[tblName];
                });
        }
    }


    _eventRegistry.set('insert', insertEvent);
    _eventRegistry.set('update', onUpdateEvent);
    _eventRegistry.set('delete', onDeleteEvent);
    _eventRegistry.set('onAlterTable', onAlterTableEvent);
    _eventRegistry.set('onCreateTable', createTable);
    _eventRegistry.set('onDropTable', onDropTableEvent);
    _eventRegistry.set('onUpdateTable', onUpdateTableEvent);
    _eventRegistry.set('onTruncateTable', _sqlFacade.delete);
    _eventRegistry.set('onResolveSchema', onResolveSchemaEvent);
    _eventRegistry.set('onRenameTable', onRenameTableEvent);
    _eventRegistry.set('onRenameDataBase', onRenameDataBaseEvent);

    // create our store table
    _sqlFacade
        .query('CREATE TABLE IF NOT EXISTS _JELI_STORE_ (_rev unique, _data)', [])
        .then(loadAllData, function() {
            throw new Error(type + " failed to initialize our store");
        });

    return _storageFacade;
}

function txError(tx, txError) {
    console.group('JDB SQL_ADAPTER');
    console.log(txError);
    console.groupEnd();
}