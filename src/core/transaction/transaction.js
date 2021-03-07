/**
 * 
 * @param {*} tableInfo 
 * @param {*} mode 
 * @param {*} isMultipleTable 
 * @param {*} tables 
 * @param {*} dbName 
 */
function jTblQuery(tableInfo, mode, isMultipleTable, tables, dbName) {
    var tblMode = mode || 'read',
        _recordResolvers = privateApi.getActiveDB(dbName).get('recordResolvers');
    this.executeState = [];
    this.tables = tables;
    this.errLog = [];
    this.isMultipleTable = isMultipleTable;
    this.DB_NAME = dbName;
    this.processData = true;
    this.getError = function() {
        return this.errLog;
    };

    this.cleanup = function() {
        tableInfo = null;
        this.executeState.length = 0;
        this.errLog.length = 0;
        _recordResolvers = null;
    };

    this.getTableInfo = function(tableName) {
        if (isMultipleTable && tableInfo.hasOwnProperty(tableName)) {
            return tableInfo[tableName];
        }

        return tableInfo;
    };

    this.tableInfoExists = function(tableName) {
        return isMultipleTable && tableInfo.hasOwnProperty(tableName);
    };

    this.setDBError = function(msg) {
        if (!$inArray(msg, this.errLog)) {
            this.errLog.push(msg);
        }
    };

    this.hasError = function() {
        return this.errLog.length;
    };

    this.getAllRef = function(data) {
        return [].map.call(data || tableInfo.data, function(item) {
            return item._ref;
        });
    };

    this.getColumnValues = function(data, columnName) {
        return data.reduce(function(previousValue, currentValue) {
            var value = currentValue._data[columnName];
            if (!$isUndefined(value) && !$isNull(value)) {
                previousValue.push(value);
            }
            return previousValue;
        }, []);
    };

    //Check if Table Information is available from the DB
    if (!$isObject(tableInfo)) {
        errorBuilder('Unable to perform query at the moment, please try again later');
    }

    //Check the required Mode
    if ($inArray('write', tblMode)) {
        this.dataProcessing = function(process) {
            this.processData = process;
            return this;
        };

        this.updateOfflineCache = function(type, data, tableName) {
            var ignoreSync = privateApi.getNetworkResolver('ignoreSync', dbName);
            if ((!ignoreSync || ($isArray(ignoreSync) && !$inArray(tableName, ignoreSync)) && data.length)) {
                _recordResolvers
                    .set(tableName)
                    .data(type, data);
            }
        };

        this.validator = TransactionDataAndColumnValidator;
        this.insert = transactionInsert;
        this.insertReplace = TransactionInsertReplace;
        this.update = transactionUpdate;
        this._autoSync = liveProcessor(dbName);

        //@Function lastInsertId
        //@parameter null
        //@return INTERGER

        this.lastInsertId = function() {
            return tableInfo.lastInsertId;
        };

        this['delete'] = transactionDelete;
    }

    if ($inArray('read', tblMode)) {
        if (isMultipleTable) {
            //Query Logic Object
            //Where and SortBy Logics
            this.condition = new $query(tableInfo.data);
        }


        this.select = transactionSelect;
        this.getColumn = transactionSelectColumn;

        /**
         * Quick Search Language
         */
        this.qsl = new generateQuickSearchApi(this);

    }

    function generateQuickSearchApi(_super) {
        var self = this;
        if (!isMultipleTable) {
            expect(tableInfo.columns[0]).each(function(column, columnName) {
                self['findby' + columnName] = buildQuery(columnName);
            });
        } else {
            self.findByColumn = buildQuery;
        }


        function buildQuery(columnName) {
            var query = {};
            query[columnName] = {
                type: "$isEqual",
                value: null
            };

            return function(value, table) {
                if (isMultipleTable && !table) {
                    errorBuilder('Current state is having multiple table, please specify the table');
                }
                /**
                 * set the query value
                 */
                query[columnName].value = value;

                return _super.select('*', {
                        where: query
                    })
                    .execute();

            }
        }
    }
}

jTblQuery.prototype.execute = function(disableOfflineCache) {
    if (this.executeState.length) {
        var defer = new _Promise(),
            error = !1,
            $self = this,
            executeLen = this.executeState.length,
            total = executeLen,
            results = [],
            autoSync = [];
        while (executeLen--) {
            var ex = this.executeState.shift();
            var res = { state: ex[0] };
            try {
                res = ex[1].call(ex[1], disableOfflineCache);
            } catch (e) {
                res.message = e.message;
                error = true;
            } finally {
                $self.errLog = [];
                if ($inArray(ex[0], ["insert", "update", "delete"]) && !error) {
                    /**
                     * Sync to the backend
                     * Available only when live is define in configuration
                     * @param {TABLE_NAME}
                     * @param {DB_NAME}
                     * @return {FUNCTION}
                     */
                    $self._autoSync(res.table, ex[0], function(ajaxResponse) {
                        if (ajaxResponse) {
                            res.$ajax = ajaxResponse;
                        }

                        complete('resolve', res);
                    }, function(error) {
                        complete('reject', {
                            state: ex[0],
                            message: 'transaction complate but failed to sync to server',
                            $ajax: error
                        });
                    });
                } else {
                    complete(error ? 'reject' : 'resolve', res);
                }
            }
        };

        /**
         * 
         * @param {*} type 
         * @param {*} res 
         */
        function complete(type, res) {
            results.push(res);
            /**
             * cleanUp
             */
            if (!$self.executeState.length) {
                defer[type]((total > 1) ? results : results.pop());
                $self.cleanup();
            }
        }


        return new DBPromise(defer);
    }
};