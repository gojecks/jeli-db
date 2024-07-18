/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
class DatabaseInstance {
    constructor(name, version) {
        //set the DB name for reference
        this.name = name;
        this.version = version;
        this.schema = new PublicSchema(this);
        this.env = new ApplicationEnvInstance(name);
        this.helpers = Object.create({
            list: [],
            add: function (help) {
                this.list.push(help);
            },
            get: function () {
                return this.list;
            },
            overwrite: function (helps) {
                if (isarray(helps) && helps.length) {
                    this.list = helps;
                }
            }
        });

        if (privateApi.getNetworkResolver('serviceHost', name)) {
            //add event listener to db
            // clientService
            this.clientService = new clientService(name);
        }
    }

    transaction = DatabaseInstanceTransaction;
    table = DatabaseInstanceTable;
    replicate = DatabaseInstanceReplicate;
    jQl = DatabaseInstanceJQL;
    createTbl = DatabaseInstanceCreateTable;
    api = DatabaseInstanceApi;

    storeProc() {
        return new StoreProcedure(this);
    }

    onUpdate(realtimeConfig) {
        var socketEnabled = privateApi.getNetworkResolver('enableSocket', this.name);
        var _realtimeConfig = Object.assign({
            type: 'db',
            dbName: this.name,
            socketEnabled: socketEnabled
        }, realtimeConfig || {});

        var connector = this.getConnector('realtime-connector', _realtimeConfig);
        return connector;
    };



    getConnector(name, config) {
        var connector = Database.connectors.use(name);
        return new connector(config);
    }

    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        privateApi.closeDB(this.name, flag);
    }

    /**
     * get the DATABASE info
     * loop through the tables 
     * generate a new table Object containing the information of each tables
     */
    info() {
        var tableSet = [],
            tables = privateApi.get(this.name, 'tables');
        if (tables) {
            for (var tblName in tables) {
                tableSet.push(copy({
                    name: tblName,
                    records: tables[tblName]._records,
                    columns: tables[tblName].columns,
                    primaryKey: tables[tblName].primaryKey,
                    foreignKey: tables[tblName].foreignKey,
                    allowedMode: tables[tblName].allowedMode,
                    lastModified: tables[tblName].lastModified,
                    index: tables[tblName].index,
                    alias: tables[tblName].alias || ''
                }, true));
            }
        }

        return tableSet;
    }

    /**
     * 
     * @param {*} flag 
     * @param {*} db 
     * @param {*} localOnly 
     */
    drop(flag, db, localOnly) {
        var dbName = this.name;
        return new DBPromise(function (resolve, reject) {
            if (flag) {
                var dbResponse = privateApi.removeDB(db || dbName, localOnly);
                (isequal(dbResponse.code, 'error') ? reject : resolve)(dbResponse);
            } else {
                reject({ message: "Unable to drop DB, either invalid flag or no priviledge granted!!", errorCode: 401 });
            }
        });
    };

    /**
     * perform many transaction in one command
     * @param {*} transactions 
     * @returns 
     */
    batchTransaction(transactions) {
        return new Promise((resolve, reject) => {
            if (!transactions || !isarray(transactions)) {
                throw new TransactionErrorEvent('BatchTransaction', 'nothing to commit or invalid transaction format');
            }

            var tables = transactions.map(tx => tx.table);
            this.transaction(tables, "write").then(startBatchTransaction, err => reject(err));

            function startBatchTransaction(tx) {
                transactions.forEach(performTransaction);

                function performTransaction(transaction) {
                    if (isequal(transaction.type, "insert")) {
                        tx.result.insert(transaction.data, false, transaction.table);
                    } else if (isequal(transaction.type, "update")) {
                        tx.result.update(transaction.data, transaction.query, transaction.table);
                    } else if (isequal(transaction.type, "delete")) {
                        tx.result.delete(transaction.query, transaction.table);
                    }
                }

                var error = tx.result.getError(),
                    time = performance.now(),
                    ret = {
                        state: "batch",
                        result: {
                            message: "Batch transaction complete"
                        }
                    };
                /**
                 * check if queries contains error
                 */
                if (error.length) {
                    ret.result.message = error.join('\n');
                    reject(ret);
                    tx.result.cleanup();
                } else {
                    tx.result.execute()
                        .then(function (res) {
                            ret.result.transactions = res;
                            ret.timing = performance.now() - time;
                            resolve(ret);
                        });
                }
            }
        });

    }

    rename(newName) {
        var dbName = this.name;
        return new Promise((resolve, reject) => {
            /**
             * 
             * @param {*} res 
             */
            var renameClient = (res) => {
                privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.RENAME_DATABASE, [dbName, newName, () =>{
                    // set the new name 
                    this.name = newName;
                    privateApi.databaseContainer.rename(dbName, newName);
                    resourceInstance.renameResource(newName);
                    resolve(res);
                }]);
            };
    
            var resourceInstance = privateApi.getActiveDB(dbName).get(constants.RESOURCEMANAGER);
            if (isequal(dbName, newName)) {
                failed({ message: newName + ' cannot be same as ' + dbName });
            } else {
                var resource = resourceInstance.getResource();
                if (resource && resource.lastSyncedDate) {
                    // rename from BE before  updating client 
                    this.api({ path: '/application/rename', data: { name: newName } })
                        .then(renameClient, reject);
                } else {
                    renameClient(dbSuccessPromiseObject('rename', "application renamed successfully"));
                }
            }
    
            function failed(err) {
                reject(dbErrorPromiseObject(err.message || 'Unabled to rename application, please try again'));
            }
        });
    }

    /**
     * 
     * @param {*} table 
     * @param {*} type 
     * @param {*} title 
     * @returns 
     */
    export(table, type, title) {
        var type = type || 'csv';
        var exp = jExport.handlers[type](title, table == 'all');
        var name = this.name;
    
        function extractTableSchema(tableName){
            var tableSchema = privateApi.getTable(name, tableName);
            if (!tableSchema) return false;
            var tableData = privateApi.getTableData(name, tableName);
            //if export type was a JSON format
            if (['json', 'jql'].includes(type)) {
                //put the json data
                exp.put(tableSchema, tableData);
            } else {
                //set label
                exp.put(tableName, Object.keys((tableSchema.columns[0] || {})), tableData);
            }
    
            return true;
        }
    
        return ({
            initialize: () => {
               var notFound = false;
                // export all table schematics and data
                if (table =='all') {
                    var tableNames = privateApi.getDbTablesNames(name);
                    for(var tableName of tableNames) {
                        if(!extractTableSchema(tableName)){
                            notFound = true;
                            console.log('Failed to extract '+ tableName + ', schema configuration not found');
                            break;
                        }
                    }
                } else {
                    notFound = !extractTableSchema(table);
                }
    
                //Parse the data of its not an OBJECT
                if (notFound) {
                    return dbErrorPromiseObject("unable to generate export, empty or invalid table provided");
                }
    
                //close the exporter
                return exp.close();
            }
        });
    }

    /**
     * 
     * @param {*} table 
     * @param {*} isSchema 
     * @param {*} handler 
     * @returns 
     */
    import(table, isSchema, handler) {
        var createTable = false;
        var db = this;
        //check if handler
        handler = Object.assign({
            logService: function (msg) {
                errorBuilder(msg)
            },
            onSelect: function () { },
            onSuccess: function () { },
            onError: function () { }
        }, handler || {});
    
        function processJQL(data) {
            var total = data.length;
            var start = 0;
            var result = {
                messages: []
            };
    
            function process() {
                if (isequal(total, start)) {
                    return handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
                }
    
                var query = data[start];
                start++;
    
                db.jQl(query).then(function (ret) {
                    handler.logService(ret.result.message);
                    process();
                },
                    function (err) {
                        handler.logService(err.message + " on line : " + start);
                        process();
                    });
            }
            
            process();
        }
    
        /**
         * import Handler
         */
        var coreImportHandler = {
            onSuccess: function (jdbSchemaData) {
                handler.logService('Writing DB schemas');
                // start JQL imortation
                if (typeof jdbSchemaData == 'string') {
                    return processJQL(jdbSchemaData)
                }
    
                handler.logService('SchemaData:' + JSON.stringify(jdbSchemaData, null, 3));
                var schemaProcess = new CoreSchemaProcessService(db);
                schemaProcess.process(jdbSchemaData, function () {
                    schemaProcess.processCrud(() => {
                        handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
                    })
                });
            },
    
            onError: function (err) {
                handler.logService(err);
                handler.onError(dbErrorPromiseObject("Completed with errors"));
            }
        };
    
        if (handler.onselect) {
            coreImportHandler.onselect = handler.onselect;
        }
    
        return AutoSelectFile.start(coreImportHandler);
    }
}


/**
 * Application login instance
 * used only when login is required
 */
class DatabaseLoginInstance {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.api = DatabaseInstanceApi;
    }

    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        privateApi.closeDB(this.name, flag);
    };
}



/**
 * Application deleted instance
 * used only when applicated is deleted
 */
class DatabaseDeletedInstance {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.jQl = DatabaseInstanceJQL;
        this.info = DatabaseInstanceInfo;
    }

    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        privateApi.closeDB(this.name, flag);
    }
}

