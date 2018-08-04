//jEliDB for Sqlite
function sqliteStorage(type, config, CB) {
    //set Prototype
    //create Database
    //Param Object
    //{name: "mySQLite.db", location: 'default'}

    var dbName = config.name,
        _storageTableName = "",
        _started = false,
        _privateStore = {},
        _dbApi = useDB(createDB(dbName, config));


    function createDB($dbName, _config) {
        var ret = null;
        switch ((type || '').toLowerCase()) {
            case ('websql'):
                ret = $isSupport.websql && window.openDatabase($dbName, '1.0', $dbName + ' Storage for webSql', 50 * 1024 * 1024);
                break;
            case ('sqlite'):
            case ('sqlitecipher'):
                ret = (window.sqlitePlugin) && window.sqlitePlugin.openDatabase(_config);
                break;
        }

        return ret;
    }


    function loadAllData() {
        _dbApi.query('SELECT * FROM _JELI_STORE_', [])
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
        if (!_privateStore[dbName]) {
            (CB || noop)();
            return;
        }
        var tableNames = Object.keys(_privateStore[dbName].tables);

        resolveTableData();

        function resolveTableData() {
            if (!tableNames.length) {
                // trigger our callback
                (CB || noop)();
                return;
            }

            var current = tableNames.pop();

            _dbApi.select('select * from ' + current)
                .then(function(tx, results) {
                    var len = results.rows.length,
                        i;
                    for (i = 0; i < len; i++) {
                        _privateStore[dbName].tables[current].data.push({
                            _ref: results.rows.item(i)._ref,
                            _data: JSON.parse(results.rows.item(i)._data)
                        });

                    }
                    // loadNextData
                    resolveTableData();
                });
        }
    }


    function useDB(sqlInstance) {

        if (!sqlInstance) {
            errorBuilder('No Plugin Support for ' + type);
        }

        var _pub = {},
            _setData = function(data, setCol) {
                var col = [],
                    val = [];
                for (var i in data) {
                    col.push((setCol ? i + "=" : "") + "?");
                    if (typeof data[i] === "object") {
                        val.push(JSON.stringify(data[i]));
                    } else {
                        val.push(data[i]);
                    }
                }

                return ({
                    col: col,
                    val: val
                });
            };

        function promiseHandler($promise) {
            var succ = err = total = 0;
            this.success = function() {
                succ++;
                finalize.apply(null, arguments);
            };

            this.error = function() {
                err++;
                finalize.apply(null, arguments);
            };

            var finalize = function() {
                if ((succ + err) == total) {
                    $promise.resolve({
                        success: succ,
                        failed: err
                    });
                }
            };

            this.setTotal = function(val) {
                total = val;
            };
        }

        _pub.createTable = function(tableName, columns) {
            var $promise = new $p();
            sqlInstance.transaction(function(transaction) {
                transaction.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + columns.join(',') + ')', [], $promise.resolve, $promise.reject);
            });

            return $promise;
        };

        _pub.insert = function(table, data) {
            if (!table || !$isArray(data)) {
                errorBuilder('ERROR[SQL] : Table and data is required');
            }
            var $promise = new $p(),
                qPromise = new promiseHandler($promise);

            function run(item, tx) {
                var columns = Object.keys(item),
                    _cData = _setData(item),
                    executeQuery = "INSERT OR REPLACE INTO " + table + " (" + columns.join(',') + ") VALUES (" + _cData.col.join(',') + ")";
                tx.executeSql(executeQuery, _cData.val, qPromise.success, qPromise.error);
            }



            sqlInstance.transaction(function(transaction) {
                qPromise.setTotal(data.length);
                expect(data).each(function(item) {
                    run(item, transaction)
                });
            });

            return $promise;
        };

        _pub.select = function(executeQuery, data) {
            if (!executeQuery) {
                errorBuilder('ERROR[SQL] : Table is required');
            }

            var $promise = new $p();
            sqlInstance.transaction(function(transaction) {
                transaction.executeSql(executeQuery, data || [], $promise.resolve, $promise.reject);
            });

            return $promise;
        };

        _pub.delete = function(table, data, where, ex) {
            if (!table) {
                errorBuilder('ERROR[SQL] : Table and data is required');
            }

            var $promise = new $p(),
                qPromise = new promiseHandler($promise);

            function run(item, tx) {
                executeQuery = "DELETE FROM " + table;
                if (where) {
                    executeQuery += " " + where;
                    ex = [item[ex] || item];
                }

                tx.executeSql(executeQuery, ex || [], qPromise.success, qPromise.error);
            }


            sqlInstance.transaction(function(transaction) {
                if (data) {
                    qPromise.setTotal(data.length);
                    expect(data).each(function(item) {
                        run(item, transaction)
                    });
                } else {
                    run({}, transaction);
                }
            });

            return $promise;
        };

        _pub.update = function(table, data, where) {
            if (!table || !$isArray(data)) {
                errorBuilder('ERROR[SQL] : Table and data is required');
            }

            var $promise = new $p(),
                qPromise = new promiseHandler($promise);

            function run(item, tx) {
                var executeQuery = "UPDATE " + table + " SET ",
                    _cData = _setData(item._data, true);

                executeQuery += " " + _cData.col.join(',');
                executeQuery += "  WHERE _ref='" + item._ref + "'";
                tx.executeSql(executeQuery, _cData.val, qPromise.success, qPromise.error);
            }

            sqlInstance.transaction(function(transaction) {
                qPromise.setTotal(data.length);
                expect(data).each(function(item) {
                    run(item, transaction)
                });
            });

            return $promise;
        };

        _pub.dropTable = function(table) {
            if (!table) {
                errorBuilder('ERROR[SQL] : Table is required');
            }

            var $promise = new $p(),
                executeQuery = "DROP TABLE  IF EXISTS " + table;

            sqlInstance.transaction(function(transaction) {
                transaction.executeSql(executeQuery, [], $promise.resolve, $promise.reject);
            });

            return $promise;
        };

        _pub.alterTable = function(tbl, columnName, type) {
            var $promise = new $p(),
                executeQuery = "ALTER TABLE " + tbl + " ADD " + columnName + " " + type;

            sqlInstance.transaction(function(transaction) {
                transaction.executeSql(executeQuery, [], $promise.resolve, $promise.reject);
            });

            return promise;
        }

        _pub.dropTables = function(tables) {
            if (!$isArray(tables)) {
                errorBuilder('ERROR[SQL] : expected ArrayList<tbl>');
            }

            var $promise = new $p(),
                qPromise = new promiseHandler($promise);

            function run(tbl, tx) {
                executeQuery = "DROP TABLE  IF EXISTS " + tbl;
                tx.executeSql(executeQuery, [], qPromise.success, qPromise.error);
            }

            sqlInstance.transaction(function(transaction) {
                expect(tables).each(function(tbl) {
                    run(tbl, transaction);
                });
            });

            return $promise;
        };

        _pub.query = function(query, data) {
            var $promise = new $p();
            sqlInstance.transaction(function(tx) {
                tx.executeSql(query, data, $promise.resolve, $promise.reject);
            });

            return $promise;
        };

        return _pub;
    };


    /**
     * 
     * @param {*} obj 
     */
    function removeTableData(obj) {
        var tableNames = Object.keys(obj.tables);

        tableNames.forEach(function(tbl) {
            obj.tables[tbl].data = [];
        });

        return obj;
    }

    function txError(tx, txError) {
        console.log(txError);
    }


    /**
        register to storage events
    **/

    $queryDB.storageEventHandler
        .subscribe(eventNamingIndex(dbName, 'insert'), function(tbl, data) {
            _dbApi.insert(tbl, data);
        })
        .subscribe(eventNamingIndex(dbName, 'update'), function(tbl, data) {
            _dbApi.update(tbl, data)
                .then(function() {}, txError);
        })
        .subscribe(eventNamingIndex(dbName, 'delete'), function(tbl, data) {
            _dbApi.delete(tbl, data, " WHERE _ref=?", '_ref')
                .then(function() {}, txError);
        })
        .subscribe(eventNamingIndex(dbName, 'onCreateTable'), createTable)
        .subscribe(eventNamingIndex(dbName, 'onDropTable'), _dbApi.dropTable)
        .subscribe(eventNamingIndex(dbName, 'onTruncateTable'), _dbApi.delete)
        .subscribe(eventNamingIndex(dbName, 'onResolveSchema'), function(tables) {
            tables.forEach(function(tbl) {
                createTable(tbl);
            });
        })
        .subscribe(eventNamingIndex(dbName, 'onRenameTable'), function(oldTableName, newTableName) {
            console.log(arguments);
        });

    function createTable(tbl) {
        return _dbApi.createTable(tbl, ['_ref unique', '_data']);
    }



    function publicApis() {
        /**
         * 
         * @param {*} name 
         */
        this.usage = function(name) {
            return JSON.stringify(this.getItem(name) || '').length;
        };

        /**
         * 
         * @param {*} name 
         */
        this.getItem = function(name) {
            return _privateStore[name];
        };

        /**
         * 
         * @param {*} name 
         * @param {*} item 
         */
        this.setItem = function(name, item) {
            if (item.tables) {
                // remove the table from object
                update(removeTableData(JSON.parse(JSON.stringify(item))));
            } else {
                update(item);
            }

            function update(newSet) {
                _dbApi.query('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)', [name, JSON.stringify(newSet)])
                    .then(function() {
                        _privateStore[name] = item;
                    });
            }

        };
    };

    publicApis.prototype.removeItem = function(name) {
        _dbApi.query('DELETE FROM _JELI_STORE_ WHERE _rev=?', [name])
            .then(function() {
                delete _privateStore[name];
            });

        return true;
    };



    publicApis.prototype.clear = function() {
        _dbApi.query('DELETE FROM _JELI_STORE_', [])
            .then(function() {
                _privateStore = {};
            });
    };

    /**
     * 
     * @param {*} oldName 
     * @param {*} newName 
     */
    publicApis.prototype.rename = function(oldName, newName, cb) {
        var newData = copy(_privateStore[oldName], true),
            tablesData = {},
            tbls = ['_JELI_STORE_'],
            _self = this;
        /**
         * loop through tables
         * store each table Data
         */
        expect(newData.tables).each(function(tbl, tblName) {
            tbl.DB_NAME = newName;
            tablesData[tblName] = tbl.data.slice();
            tbl.data = [];
            tbl.lastModified = +new Date
            tbls.push(tblName);
        });
        var bkInstance = useDB(createDB(newName, extend(config, { name: newName })));
        $queryDB.$getActiveDB(oldName).$get('recordResolvers').rename(newName);
        _dbApi.dropTables(tbls);
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
                        _rev: $queryDB.getResourceName(newName),
                        _data: _self.getItem($queryDB.getResourceName(oldName))
                    }, {
                        _rev: $queryDB.getDataResolverName(newName),
                        _data: _self.getItem($queryDB.getDataResolverName(newName))
                    }])
                    .then(function() {
                        expect(newData.tables).each(createAndInsert);
                        (cb || noop)();
                        _self.clear();
                    });
            });

        function createAndInsert(tbl, tblName) {
            bkInstance.createTable(tblName, ['_ref unique', '_data'])
                .then(function() {
                    bkInstance.insert(tblName, tablesData[tblName])
                    delete tablesData[tblName];
                });
        }
    };


    this.mockLocalStorage = function() {
        // create our store table
        _dbApi.query('CREATE TABLE IF NOT EXISTS _JELI_STORE_ (_rev unique, _data)', [])
            .then(loadAllData)
            .catch(function() {
                errorBuilder(type + " catched to initialize our store");
            });

        return new publicApis();
    };

    this.useDB = useDB;
}