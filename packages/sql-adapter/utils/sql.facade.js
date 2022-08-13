/**
 * 
 * @param {*} sqlInstance 
 */
function CoreSqlFacade(sqlInstance) {

    if (!sqlInstance) {
        throw new TypeError('No Plugin Support for ' + type);
    }

    /**
     * 
     * @param {*} data 
     * @param {*} setCol 
     * @param {*} addRef 
     */
    function _setData(data, setCol, addRef) {
        var col = [],
            val = [],
            keys = [];
        if (addRef) {
            col.push('?');
            val.push(data._ref);
            keys.push('_ref');
            data = data._data;
        }

        for (var i in data) {
            col.push((setCol ? i + "=" : "") + "?");
            keys.push(i);
            if (typeof data[i] === "object") {
                val.push(JSON.stringify(data[i]));
            } else {
                val.push(data[i]);
            }
        }

        return ({
            col: col,
            val: val,
            keys: keys
        });
    }

    /**
     * 
     * @param {*} total 
     */
    function promiseHandler(total) {
        var succ = 0,
            err = 0,
            total = total || 0,
            sucCB = function() {},
            errCB = function() {};
        this.success = function() {
            succ++;
            finalize.apply(null, arguments);
        };

        this.error = function() {
            err++;
            finalize.apply(null, arguments);
        };

        var finalize = function() {
            if (err == total) {
                errCB.apply(null, arguments);
            } else if (succ === total) {
                sucCB.apply(null, arguments);
            } else if ((succ + err) == total) {
                sucCB({
                    success: succ,
                    failed: err
                });
            }
        };

        this.setTotal = function(val) {
            total = val;
        };

        /**
         * @param succ
         * @param err
         */
        this.then = function(succ, err) {
            sucCB = succ || sucCB;
            errCB = err || errCB;
            /**
             * trigger finalize
             */
            finalize();
        };
    }


    this.createTable = function(tableName, columns) {
        var qPromise = new promiseHandler(1);
        sqlInstance.transaction(function(transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + columns.join(',') + ')', [], qPromise.success, qPromise.error);
        });

        return qPromise;
    };

    this.insert = function(table, data) {
        if (!table || !isArray(data)) {
            errorBuilder('ERROR[SQL] : Table and data is required');
        }
        var qPromise = new promiseHandler(data.length);

        function run(item, tx) {
            var _cData = _setData(item, false, true),
                executeQuery = "INSERT OR REPLACE INTO " + table + " (" + _cData.keys.join(',') + ") VALUES (" + _cData.col.join(',') + ")";
            tx.executeSql(executeQuery, _cData.val, qPromise.success, qPromise.error);
        }



        sqlInstance.transaction(function(transaction) {
            data.forEach(function(item) {
                run(item, transaction);
            });
        });

        return qPromise;
    };

    this.select = function(executeQuery, data) {
        if (!executeQuery) {
            throw new Error('ERROR[SQL] : Table is required');
        }

        var qPromise = new promiseHandler(1);
        sqlInstance.transaction(function(transaction) {
            transaction.executeSql(executeQuery, data || [], qPromise.success, qPromise.error);
        });

        return qPromise;
    };

    this.delete = function(table, data, where, ex) {
        if (!table) {
            throw new Error('ERROR[SQL] : Table and data is required');
        }

        var qPromise = new promiseHandler(data ? data.length : 1);
        /**
         * 
         * @param {*} item 
         * @param {*} tx 
         */
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
                data.forEach(function(item) {
                    run(item, transaction);
                });
            } else {
                run({}, transaction);
            }
        });

        return qPromise;
    };

    this.update = function(table, data) {
        if (!table || !isArray(data)) {
            throw new Error('ERROR[SQL] : Table and data is required');
        }

        var qPromise = new promiseHandler(data.length);

        function run(item, tx) {
            var _cData = _setData(item._data, true);
            var executeQuery = "UPDATE " + table + " SET " + _cData.col.join(',');
            executeQuery += "  WHERE _ref='" + item._ref + "'";
            tx.executeSql(executeQuery, _cData.val, qPromise.success, qPromise.error);
        }

        sqlInstance.transaction(function(transaction) {
            data.forEach(function(item) {
                run(item, transaction);
            });
        });

        return qPromise;
    };

    this.dropTable = function(table) {
        if (!table) {
            throw new Error('ERROR[SQL] : Table is required');
        }

        var qPromise = new promiseHandler(1),
            executeQuery = "DROP TABLE IF EXISTS " + table;

        sqlInstance.transaction(function(transaction) {
            transaction.executeSql(executeQuery, [], qPromise.success, qPromise.error);
        });

        return qPromise;
    };

    this.alterTable = function(tbl, columnName, addRemoved) {
        var qPromise = new promiseHandler(1),
            executeQuery = "ALTER TABLE " + tbl;

        if (typeof columnName === "object") {
            // RENAME process
            executeQuery += 'RENAME COLUMN ' + columnName[0] + ' TO ' + columnName[1];
        } else {
            executeQuery += (addRemoved ? " ADD " : " DROP ") + columnName;
        }

        sqlInstance.transaction(function(transaction) {
            transaction.executeSql(executeQuery, [], qPromise.success, qPromise.error);
        });

        return qPromise;
    }

    this.dropTables = function(tables) {
        if (!isArray(tables)) {
            throw new Error('ERROR[SQL] : expected ArrayList<tbl>');
        }

        var qPromise = new promiseHandler(tables.length);

        function run(tbl, tx) {
            executeQuery = "DROP TABLE  IF EXISTS " + tbl;
            tx.executeSql(executeQuery, [], qPromise.success, qPromise.error);
        }

        sqlInstance.transaction(function(transaction) {
            tables.forEach(function(tbl) {
                run(tbl, transaction);
            });
        });

        return qPromise;
    };

    this.query = function(query, data) {
        var qPromise = new promiseHandler(1);
        sqlInstance.transaction(function(tx) {
            tx.executeSql(query, data, qPromise.success, qPromise.error);
        });

        return qPromise;
    };
}