/**
 * 
 * @param {*} tables 
 * @param {*} mode 
 * @param {*} isMultipleTable 
 * @param {*} dbName 
 */
function TableTransaction(tables, mode, isMultipleTable, dbName) {
    var tblMode = mode || 'read';
    var _recordResolvers = null;
    this.executeState = [];
    this.tables = tables;
    this.rawTables = Object.values(this.tables);
    this.errLog = [];
    this.isMultipleTable = isMultipleTable;
    this.DB_NAME = dbName;
    this.processData = true;
    this.getError = function(fields) {
        return {
            fields,
            logs: this.errLog
        };
    };

    this.cleanup = function() {
        this.executeState.length = 0;
        this.errLog.length = 0;
        _recordResolvers = null;
    };

    this.getTableInfo = function(tableName) {
        return privateApi.getTable(dbName, tableName);
    };

    this.tableInfoExists = function(tableName) {
        return isMultipleTable && this.rawTables.includes(tableName);
    };


    this.getAllRef = function(data) {
        return [].map.call(data || [], function(item) {
            return item._ref;
        });
    };

    this.getColumnValues = function(tableName, columnName) {
        var tableData = this.getTableData(tableName);
        return tableData.reduce(function(previousValue, currentValue) {
            var value = currentValue._data[columnName];
            if (!isundefined(value) && !isnull(value)) {
                previousValue.push(value);
            }
            return previousValue;
        }, []);
    };

    //Check the required Mode
    if (inarray('write', tblMode)) {
        _recordResolvers = privateApi.getActiveDB(dbName).get(constants.RECORDRESOLVERS);
        this.dataProcessing = function(process) {
            this.processData = process;
            return this;
        };

        /**
         * 
         * @param {*} type 
         * @param {*} data 
         * @param {*} tableName 
         */
        this.updateOfflineCache = function(type, data, tableName) {
            var ignoreSync = privateApi.getNetworkResolver('ignoreSync', dbName);
            // check for sync ignore in db configuration
            if ((!ignoreSync || (isarray(ignoreSync) && !inarray(tableName, ignoreSync)) && data.length)) {
                _recordResolvers.setData(tableName, type, data);
            }
        };

        this.validator = TransactionDataAndColumnValidator;
        this.insert = transactionInsert;
        this.insertReplace = TransactionInsertReplace;
        this.update = transactionUpdate;
        this['delete'] = transactionDelete;
    }

    if (inarray('read', tblMode)) {
        this.select = transactionSelect;
        /**
         * Quick Search Language
         */
        this.qsl = function() {
            return new generateQuickSearchApi(this);
        };
    }
}

/**
 * 
 * @param {*} tableInfo 
 * @returns 
 */
TableTransaction.prototype.getTableIncCallback = function (tableInfo) {
    var columns = tableInfo.columns[0];
   var fields = Object.keys(columns).filter((column) =>  (
        columns[column].AUTO_INCREMENT && inarray(columns[column].type.toUpperCase(), ['INT', 'NUMBER', 'INTEGER']))
   );

   return function(data) {
       var inc = ++tableInfo.lastInsertId;
       if (fields.length) {
           fields.forEach(function(field) {
               data[field] = inc;
           });
       }
   };
}

/**
 * 
 * @param {*} tableInfo 
 * @param {*} record 
 * @param {*} action 
 */
TableTransaction.prototype.performTableAction = function(tableInfo, record, action){
    var columns = tableInfo.columns[0];
    for(var column in columns) {
        var onUpdateConfig = columns[column][action];
        if (onUpdateConfig && isstring(onUpdateConfig)) {
            record[column] = getDefaultColumnValue(onUpdateConfig);
        }
    }
}

TableTransaction.prototype.setDBError = function(msg) {
    if (!inarray(msg, this.errLog)) {
        this.errLog.push(msg);
    }
}

TableTransaction.prototype.hasError = function() {
    return this.errLog.length;
}

TableTransaction.prototype.getTableData = function(tableName) {
    return privateApi.getTableData(this.DB_NAME, tableName);
};

TableTransaction.prototype.execute = function(disableOfflineCache) {
    var executeStates = this.executeState;
    var executeLen = executeStates.length;
    var isLiveEnabled = privateApi.getNetworkResolver('live', this.DB_NAME);
    return new Promise((resolve, reject) => {
        if (executeLen) {
            var error = !1;
            var total = executeLen;
            var results = [];
            /**
             * 
             * @param {*} success 
             * @param {*} res 
             */
            var complete = (success, res) => {
                results.push(res);
                /**
                 * cleanUp
                 */
                if (!executeLen) {
                    (success ? resolve : reject)((total > 1) ? results : results.pop());
                    this.cleanup();
                }
            };

            while (executeStates.length) {
                executeLen--;
                var ex = executeStates.shift();
                var res = { state: ex[0] };
                try {
                    res = ex[1].call(ex[1], disableOfflineCache);
                } catch (err) {
                    if (err instanceof TransactionErrorEvent) {
                        res = err;
                    } else {
                        res.message = err.message;
                    }
                    
                    error = true;
                } finally {
                    this.errLog = [];
                    if (isLiveEnabled && inarray(ex[0], ['insert', 'update', 'delete', 'insertReplace']) && !error) {
                        /**
                         * Sync to the backend
                         * Available only when live is define in configuration
                         * @param {TABLE_NAME}
                         * @param {DB_NAME}
                         * @return {FUNCTION}
                         */
                        privateApi.autoSync(this.DB_NAME, res.table, ex[0])
                            .then(function(ajaxResponse) {
                                if (ajaxResponse) {
                                    res.$ajax = ajaxResponse;
                                }

                                complete(true, res);
                            }, function(error) {
                                complete(false, {
                                    state: ex[0],
                                    message: 'transaction complete but failed to sync to server',
                                    $ajax: error
                                });
                            });
                    } else {
                        complete(!error, res);
                    }
                }
            };
        }
    });
};