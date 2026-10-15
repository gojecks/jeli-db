/**
 * 
 * @param {*} tables 
 * @param {*} mode 
 * @param {*} isMultipleTable 
 * @param {*} dbName 
 */
class TableTransaction {
    static createInstance(tables, mode, isMultipleTable, dbName) {
        return new TableTransaction(tables, mode, isMultipleTable, dbName);
    }

    static ALLOWED_WRITE(mode){
        return inarray(mode, ['insert', 'update', 'delete', 'insertReplace']);
    }

    constructor(tables, mode, isMultipleTable, dbName) {
        var tblMode = mode || 'read';
        this._recordResolvers = null;
        this.executeState = [];
        this.tables = tables;
        this.rawTables = Object.values(this.tables);
        this.errLog = [];
        this.isMultipleTable = isMultipleTable;
        this.DB_NAME = dbName;
        this.processData = true;

        //Check the required Mode
        if (inarray('write', tblMode)) {
            this._recordResolvers = privateApi.getActiveDB(dbName).get(constants.RECORDRESOLVERS);
            this.dataProcessing = function (process) {
                this.processData = process;
                return this;
            };

            /**
             * 
             * @param {*} type 
             * @param {*} refs 
             * @param {*} tableName 
             */
            this.updateOfflineCache = function (type, refs, tableName) {
                var ignoreSync = privateApi.getConfigData('ignoreSync', dbName);
                // check for sync ignore in db configuration
                if ((!ignoreSync || (Array.isArray(ignoreSync) && !ignoreSync.includes(tableName)) && refs.length)){
                    this._recordResolvers.setData(tableName, type, refs);
                }
            }

            this.insert = transactionInsert;
            this.insertReplace = TransactionInsertReplace;
            this.update = transactionUpdate;
            this.delete = transactionDelete;
        }

        if (inarray('read', tblMode)) {
            this.select = transactionSelect;
            /**
             * Quick Search Language
             */
            this.qsl = function () {
                var queryDSL = {};
                /**
                 * 
                 * @param {*} columnName 
                 * @returns 
                 */
                var buildQuery = (columnName) => {
                    var query = {};
                    query[columnName] = {
                        type: "eq",
                        value: null
                    };

                    return (value, fields) => {
                        if (isMultipleTable) {
                           return  errorBuilder('Current state is having multiple table, please specify the table');
                        }
                        /**
                         * set the query value
                         */
                        query[columnName].value = value;

                        return this.select(fields || '*', { where: query }).execute();
                    };
                };

                if (!this.isMultipleTable) {
                    var tableColumns = Object.keys(this.getTableInfo().columns[0])
                    for (var i = 0; i < tableColumns.length; i++) {
                        queryDSL['findby' + tableColumns[i]] = buildQuery(tableColumns[i]);
                    }
                } else {
                    queryDSL.findByColumn = buildQuery;
                }

                return queryDSL;
            };
        }
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} columns 
     * @param {*} callback 
     * @returns 
     */
    validator(tableName, columns, callback, mode = 'i') {
        const _typeValidator = privateApi.getActiveDB(this.DB_NAME).get(constants.DATATYPES);
        callback = callback || noop;

        /**
         * 
         * @param {*} cData 
         * @param {*} dataRef 
         */
        return (cData, dataRef) => {
            //Process the Data
            let passed = 1;
            if (cData) {
                const cdataKeys = Object.keys(cData);
                for (let key of cdataKeys) {
                    if(key === '_id') {
                        // skip check for _id
                        if (!cData['_id']){
                            this.setDBError('_id field is required');
                            return;
                        }

                        continue;
                    } else if (key == '$exp') {
                        if (!Array.isArray(cData[key])) {
                            this.setDBError(`${key} field must be an object containing op,key`);
                            passed = false;
                            return;
                        }
                        continue;
                    }

                    //check if column is in table
                    if (!columns[key]) {
                        //throw new error
                        this.setDBError('column (' + key + ') was not found on this table (' + tableName + '), to add a new column use the addColumn FN - ref #' + dataRef);
                        callback(key);
                        passed = !1;
                        return;
                    }

                    const type = typeof cData[key];
                    const requiredType = (columns[key].type || 'string').toUpperCase();
                    if (!_typeValidator.validate(cData[key], requiredType)) {
                        /**
                         * Allow null value when NOT_NULL is not configured 
                         */
                        if (isnull(cData[key]) && !columns[key].NOT_NULL && !columns[key].required) continue;

                        callback(key, requiredType, type);
                        this.setDBError(key + " Field requires " + requiredType.toUpperCase() + ", but got " + type.toUpperCase() + "(" + cData[key] + ")- ref #" + dataRef);
                        passed = !1;
                    }
                }

                return passed;
            }

            return !1;
        };

    }


    tableInfoExists(tableName) {
        return this.isMultipleTable && this.rawTables.includes(tableName);
    }

    cleanup() {
        this.executeState.length = 0;
        this.errLog.length = 0;
        this._recordResolvers = null;
    }

    getTableInfo(tableName) {
        return privateApi.getTable(this.DB_NAME, tableName);
    }

    getError(fields) {
        return {
            fields,
            logs: this.errLog
        };
    }

    getAllRef(data) {
        return [].map.call(data || [], item => (item._ref || item._id));
    }

    getColumnValues(tableName, columnName) {
        const tableData = this.getTableData(tableName);
        return tableData.reduce((previousValue, currentValue) => {
            // record compactibility support
            const value = (currentValue._data || currentValue)[columnName];
            if (!isundefined(value) && !isnull(value)) {
                previousValue.push(value);
            }
            return previousValue;
        }, []);
    }

    /**
     * 
     * @param {*} tableInfo 
     * @returns 
     */
    getTableIncCallback(tableInfo) {
        const columns = tableInfo.columns[0];
        const fields = Object.keys(columns).filter((column) => (
            columns[column].AUTO_INCREMENT && inarray(columns[column].type.toUpperCase(), ['INT', 'NUMBER', 'INTEGER']))
        );

        return data => {
            const inc = ++tableInfo.lastInsertId;
            if (fields.length) {
                fields.forEach(function (field) {
                    data[field] = inc;
                });
            }

            return data;
        };
    }

    /**
     * 
     * @param {*} tableInfo 
     * @param {*} record 
     * @param {*} action 
     */
    performTableAction(tableInfo, record, action) {
        var columns = tableInfo.columns[0];
        for (var column in columns) {
            var onUpdateConfig = columns[column][action];
            if (onUpdateConfig && isstring(onUpdateConfig)) {
                record[column] = getDefaultColumnValue(onUpdateConfig);
            }
        }
    }

    setDBError(msg) {
        if (!inarray(msg, this.errLog)) {
            this.errLog.push(msg);
        }
    }

    hasError() {
        return this.errLog.length;
    }

    getTableData(tableName, dataOnly) {
        const data = privateApi.getTableData(this.DB_NAME, tableName);
        // record compactibility support
        return !dataOnly ? data : data.map(item => item._data || item );
    }

    execute(disablePushToServer, fromBatch, rollbackOnError = false) {
        const executeStates = this.executeState;
        let executeLen = executeStates.length;
        const isLiveEnabled = privateApi.getConfigData('live', this.DB_NAME);
        let totalSuccess = 0;
        return new Promise((resolve, reject) => {
            if (executeLen) {
                let error = !1;
                let total = executeLen;
                const results = [];
                /**
                 * 
                 * @param {*} success 
                 * @param {*} res 
                 */
                const complete = (success, res) => {
                    results.push(res);
                    if (success) totalSuccess++;
                    if (!executeLen) {
                        (totalSuccess ? resolve : reject)((total > 1) ? results : results.pop());
                        this.cleanup();
                    }
                };

                while (executeStates.length) {
                    executeLen--;
                    const ex = executeStates.shift();
                    let res = { state: ex[0] };
                    try {
                        res = ex[1](disablePushToServer, rollbackOnError);
                    } catch (err) {
                        if (err instanceof TransactionErrorEvent) {
                            res = err;
                        } else {
                            res.message = err.message;
                        }

                        error = true;
                    } finally {
                        this.errLog = [];
                        if (!fromBatch && !disablePushToServer && !error && isLiveEnabled && TableTransaction.ALLOWED_WRITE(ex[0])) {
                            /**
                             * Sync to the backend
                             * Available only when live is define in configuration
                             * @param {TABLE_NAME}
                             * @param {DB_NAME}
                             * @return {FUNCTION}
                             */
                            privateApi.autoSync(this.DB_NAME, res.table, ex[0])
                                .then((ajaxResponse) => {
                                    if (ajaxResponse) {
                                        res.$ajax = ajaxResponse;
                                    }

                                    complete(true, res);
                                }, err => {
                                    complete(false, {
                                        state: ex[0],
                                        message: 'transaction complete but failed to sync to server',
                                        $ajax: err
                                    });
                                });
                        } else {
                            complete(!error, res);
                        }
                    }
                };
            }
        });
    }
}

