/**
 * 
 * @param {*} tables 
 * @param {*} mode 
 * @param {*} isMultipleTable 
 * @param {*} dbName 
 */
function TableTransaction(tables, mode, isMultipleTable, dbName) {
    var tblMode = mode || 'read';
    this.executeState = [];
    this.tables = tables;
    this.rawTables = Object.values(this.tables);
    this.errLog = [];
    this.isMultipleTable = isMultipleTable;
    this.DB_NAME = dbName;
    this.processData = true;
    this.getError = function() {
        return this.errLog;
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
            if (!$isUndefined(value) && !$isNull(value)) {
                previousValue.push(value);
            }
            return previousValue;
        }, []);
    };

    //Check the required Mode
    if ($inArray('write', tblMode)) {
        var _recordResolvers = privateApi.getActiveDB(dbName).get(constants.RECORDRESOLVERS);
        this.dataProcessing = function(process) {
            this.processData = process;
            return this;
        };

        this.updateOfflineCache = function(type, data, tableName) {
            var ignoreSync = privateApi.getNetworkResolver('ignoreSync', dbName);
            if ((!ignoreSync || ($isArray(ignoreSync) && !$inArray(tableName, ignoreSync)) && data.length)) {
                _recordResolvers.setData(tableName, type, data);
            }
        };

        this.validator = TransactionDataAndColumnValidator;
        this.insert = transactionInsert;
        this.insertReplace = TransactionInsertReplace;
        this.update = transactionUpdate;
        this['delete'] = transactionDelete;
        this._autoSync = liveProcessor(dbName);
    }

    if ($inArray('read', tblMode)) {
        this.select = transactionSelect;
        /**
         * Quick Search Language
         */
        this.qsl = function() {
            return new generateQuickSearchApi(this);
        }
    }
}

TableTransaction.prototype.setDBError = function(msg) {
    if (!$inArray(msg, this.errLog)) {
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
    var _this = this;
    return new DBPromise(function(resolve, reject) {
        if (executeLen) {
            var error = !1;
            var total = executeLen;
            var results = [];
            while (executeStates.length) {
                executeLen--;
                var ex = executeStates.shift();
                var res = { state: ex[0] };
                try {
                    res = ex[1].call(ex[1], disableOfflineCache);
                } catch (e) {
                    res.message = e.message;
                    error = true;
                } finally {
                    _this.errLog = [];
                    if ($inArray(ex[0], ["insert", "update", "delete"]) && !error) {
                        /**
                         * Sync to the backend
                         * Available only when live is define in configuration
                         * @param {TABLE_NAME}
                         * @param {DB_NAME}
                         * @return {FUNCTION}
                         */
                        _this._autoSync(res.table, ex[0])
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

            /**
             * 
             * @param {*} type 
             * @param {*} res 
             */
            function complete(success, res) {
                results.push(res);
                /**
                 * cleanUp
                 */
                if (!executeLen) {
                    (success ? resolve : reject)((total > 1) ? results : results.pop());
                    _this.cleanup();
                }
            }
        }
    });
};