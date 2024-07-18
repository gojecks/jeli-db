/**
 * 
 * @param {*} sqlInstance 
 */
class CoreSqlFacade {
   /**
    *
    * @param {*} data
    * @param {*} setCol
    * @param {*} addRef
    */
   static _setData(data, setCol, addRef) {
       var col = [], val = [], keys = [];
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

    constructor(sqlInstance) {
        if (!sqlInstance)
            throw new TypeError('No Plugin Support for ' + type);

        this.sqlInstance = sqlInstance;
    }

    createTable(tableName, columns) {
        return new SqlFacadePromise(1, (resolve, reject) => {
            this.sqlInstance.transaction(function (transaction) {
                transaction.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + columns.join(',') + ')', [], resolve, reject);
            });
        });
    }

    insert(table, data) {
        if (!table || !isArray(data)) {
            errorBuilder('ERROR[SQL] : Table and data is required');
        }

        return new SqlFacadePromise(data.length, (resolve, reject) => {
            function run(item, tx) {
                var _cData = CoreSqlFacade._setData(item, false, true), executeQuery = "INSERT OR REPLACE INTO " + table + " (" + _cData.keys.join(',') + ") VALUES (" + _cData.col.join(',') + ")";
                tx.executeSql(executeQuery, _cData.val, resolve, reject);
            }
    
    
    
            this.sqlInstance.transaction(function (transaction) {
                data.forEach(function (item) {
                    run(item, transaction);
                });
            });
        });
    }

    select(executeQuery, data) {
        if (!executeQuery) {
            throw new Error('ERROR[SQL] : Table is required');
        }

        return new SqlFacadePromise(1, (resolve, reject) => {
            this.sqlInstance.transaction(function (transaction) {
                transaction.executeSql(executeQuery, data || [], resolve, reject);
            });
        });
    }

    delete(table, data, where, ex) {
        if (!table) {
            throw new Error('ERROR[SQL] : Table and data is required');
        }

        return new SqlFacadePromise(data ? data.length : 1, (resolve, reject) => {
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

            tx.executeSql(executeQuery, ex || [], resolve, reject);
        }

        this.sqlInstance.transaction(function (transaction) {
            if (data) {
                for(var item of data){
                    run(item, transaction);
                }
            } else {
                run({}, transaction);
            }
        });
        });
    }

    update(table, data) {
        if (!table || !isArray(data)) {
            throw new Error('ERROR[SQL] : Table and data is required');
        }

        return new SqlFacadePromise(data.length, (resolve, reject) => {
            function run(item, tx) {
                var _cData = CoreSqlFacade._setData(item._data, true);
                var executeQuery = `UPDATE ${table}  SET ${_cData.col.join(',')} WHERE _ref='${item._ref}'`;
                tx.executeSql(executeQuery, _cData.val, resolve, reject);
            }
    
            this.sqlInstance.transaction(function (transaction) {
                for(var item of data){
                    run(item, transaction);
                }
            });
        });
    }

    dropTable(table) {
        if (!table) {
            throw new Error('ERROR[SQL] : Table is required');
        }

        return new SqlFacadePromise(1, (resolve, reject) => {
            this.sqlInstance.transaction(function (transaction) {
                transaction.executeSql(`DROP TABLE IF EXISTS ${table}`, [], resolve, reject);
            });
        });


    }

    alterTable(tbl, columnName, addRemoved) {
        var executeQuery = `ALTER TABLE ${tbl}`;
        return new SqlFacadePromise(1, (resolve, reject) => {
            if (typeof columnName === "object") {
                executeQuery += `RENAME COLUMN ${columnName[0]} TO ${columnName[1]}`;
            } else {
                executeQuery += `${(addRemoved ? ' ADD ' : ' DROP ')} ${columnName}`;
            }
    
            sqlInstance.transaction(function (transaction) {
                transaction.executeSql(executeQuery, [], resolve, reject);
            });
        });
    }

    dropTables(tables) {
        if (!isArray(tables)) {
            throw new Error('ERROR[SQL] : expected ArrayList<tbl>');
        }

        return new SqlFacadePromise(tables.length, (resolve, reject) => {
            function run(tbl, tx) {
                executeQuery = "DROP TABLE  IF EXISTS " + tbl;
                tx.executeSql(executeQuery, [], resolve, reject);
            }
    
            this.sqlInstance.transaction(function (transaction) {
                tables.forEach(function (tbl) {
                    run(tbl, transaction);
                });
            });
        });
    }

    query(query, data) {
        return new SqlFacadePromise(1, (resolve, reject) => {
            this.sqlInstance.transaction(function (tx) {
                tx.executeSql(query, data, resolve, reject);
            });
        });
    }
}

/**
         *
         * @param {*} total
         */
class SqlFacadePromise {
    constructor(total, callback) {
        this.succ = 0;
        this.err = 0;
        this.total = total || 0;
        this.handlers = [function () { }, function () { }];

        callback((tx, res) => {
            this.succ++;
            this.finalize(tx, res);
        }, (tx, err) => {
            this.err++;
            this.finalize(tx, err);
        });
    }

    finalize() {
        if (this.err == this.total) {
            this.handlers.pop().apply(null, arguments);
        } else if (this.succ === this.total) {
            this.handlers.shift().apply(null, arguments);
        } else if ((this.succ + this.err) == this.total) {
            this.handlers.shift()({
                success: this.succ,
                failed: this.err
            });
        }
    }

    setTotal(val) {
        this.total = val;
    };

    /**
     * @param succ
     * @param err
     */
    then(succ, err) {
        if (succ)
            this.handlers[0] = succ;
        if (err)
            this.handlers[1] = err;
        //trigger finalize
        this.finalize();
    };
}