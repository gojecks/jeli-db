/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
class DatabaseInstance {
    static createInstance(name, version, existing) {
        return new this(name, version, existing);
    }

    /**
     * 
     * @param {*} name 
     * @param {*} version 
     * @param {*} existing
     */
    constructor(name, version, existing) {
        //set the DB name for reference
        this.name = name;
        this.version = version;
        this._isExisting = existing;
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

        if (privateApi.getConfigData('serviceHost', name)) {
            //add event listener to db
            // clientService
            this.clientService = new clientService(name);
        }
    }

    replicate(definition) {
        definition.current = this.name;
        if (!definition.name) {
            definition.name = this.name + "_copy";
        }
    };

    /**
     * 
     * @param {*} URL
     * @param {*} postData 
     * @param {*} tbl 
     * @param {*} method
     * requestState can either be a STRING or OBJECT 
     * { 
     *   path:STRING,
     *   tbl:String,
     *   AUTH_TYPE:Boolean,
     *   METHOD:STRING, data:ANY,
     *   cache: boolen|{cacheId:string,ttl:number}
     * }
     */
    api(path, data) {
        const options = isobject(path) ? path : { path, data };
        const httpRequestOptions = privateApi.buildHttpRequestOptions(this.name, options);
        // no request Match found
        if (httpRequestOptions.isErrorState) {
            console.log('Invalid or missing api: ' + options.path);
            return Promise.reject({ message: "There was an error please try again later" });
        }

        // set the postData
        if (options.data) {
            if (httpRequestOptions.type && isequal(httpRequestOptions.type.toLowerCase(), 'get')) {
                httpRequestOptions.data = options.data;
            } else if (options.data instanceof FormData) {
                // append all data into formData
                for (var prop in httpRequestOptions.data) {
                    options.data.append(prop, httpRequestOptions.data[prop]);
                }
                httpRequestOptions.data = options.data;
                httpRequestOptions.contentType = false;
                httpRequestOptions.processData = false;
            } else {
                httpRequestOptions.data = options.data;
            }
        }

        return privateApi.$http(httpRequestOptions).then(
            res => dbSuccessPromiseObject('api', res), 
            err => (err || { message: "There was an error please try again later" })
        );
    }

    table(tableName, mode) {
        //get the requested table
        var tableInstance = TableInstance.factory.add(this.name, tableName, mode);
        if (!tableInstance) {
            errorBuilder(`There was an error, Table (${tableName}) was not found on this DB (${this.name}`);
        }

        return tableInstance;
    }

    truncate(syncToServer){
        return new Promise((resolve, reject) => {
            const databaseInstance = privateApi.getActiveDB(this.name);
            const _resource = databaseInstance.get(constants.RESOURCEMANAGER);
            const tableList = _resource.getTableNames();
            if (tableList && tableList.length) {
                tableList.forEach(tableName => {
                    privateApi.truncateTable(this.name, tableName);
                });
            }

            if (!syncToServer) {
                resolve(dbSuccessPromiseObject('truncateDB', 'Database truncated successfully.'));
            } else {
                this.api({ path: '/v2/database/truncate'})
                    .then(res => resolve(dbSuccessPromiseObject('truncateDB', res.result)) , err => reject(dbErrorPromiseObject('truncateDB', err)))
            }
        });
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} columns 
     * @param {*} additionalConfig 
     * @param {*} ignoreInstance 
     * @returns 
     */
    createTbl(tableName, columns, additionalConfig, ignoreInstance) {
        var response = { state: "create", result: null, errorCode: null, message: null };
        var _opendedDBInstance = privateApi.getActiveDB(this.name);
        if (tableName && _opendedDBInstance && !privateApi.tableExists(this.name, tableName)) {
            // pardon wrong columns format
            if (isobject(columns)) {
                columns = [nColumn];
            }

            var curTime = +new Date;
            var definition = Object.assign({
                columns: columns || [{}],
                DB_NAME: this.name,
                TBL_NAME: tableName,
                primaryKey: null,
                foreignKey: null,
                lastInsertId: 0,
                allowedMode: { readwrite: 1, readonly: 1 },
                proc: null,
                index: {},
                created: curTime,
                alias: '',
                lastModified: curTime,
                _hash: GUID(),
                _previousHash: '',
                policies: {
                    read: ['*'],
                    write: ['*']
                }
            }, additionalConfig || {});

            /**
             * add table to resource
             */
            _opendedDBInstance.get(constants.RESOURCEMANAGER).addTableToResource(tableName, {
                _hash: definition._hash,
                lastModified: definition.lastModified,
                created: definition.created
            });
            /**
             * broadcast event
             */
            privateApi.storageFacade.broadcast(this.name, DB_EVENT_NAMES.CREATE_TABLE, [tableName, definition]);
            privateApi.updateDB(this.name, tableName);
            //set the result
            if (!ignoreInstance) {
                response.result = TableInstance.factory.add(this.name, tableName);
            }
            response.message = 'Table(' + tableName + ') created successfully';
        } else {
            response.message = (tableName) ? 'Table(' + tableName + ') already exist' : 'Table name is required';
            response.errorCode = 402;
        }

        return response;
    }

    /**
     * 
     * @param {*} table 
     * @param {*} mode 
     * @returns 
     */
    transaction(table, mode) {
        var dbName = this.name;
        var err = [];
        var isMultipleTable = false;
        var tableJoinMapping = {};

        /**
         * 
         * @param {*} table 
         */
        function validateTableSchema(table) {
            var tableSchema = privateApi.getTable(dbName, table);
            if (!tableSchema) {
                err.push(`There was an error, Table (${table}) was not found on this DB (${dbName})`);
                return;
            }

            if (!tableSchema.columns || !isequal(tableSchema.DB_NAME, dbName) || !isequal(tableSchema.TBL_NAME, table)) {
                err.push(`Table (${table}) is not well configured, if you re the owner please delete the table and create again`);
            }
        }

        if (table) {
            //required table is an array
            if (isarray(table)) {
                table.forEach(tbl => {
                    tbl = tbl.split(' as ').map(trim);
                    tableJoinMapping[tbl[1] || tbl[0]] = tbl[0];
                    validateTableSchema(tbl[0], tbl);
                });

                //change mode to read
                isMultipleTable = table.length > 1;
            } else {
                validateTableSchema(table);
                tableJoinMapping[table] = table;
            }

            if (err.length) {
                return errorBuilder(err.join("\n"));
            }

            return TableTransaction.createInstance(tableJoinMapping, mode, isMultipleTable, dbName);
        }

        return errorBuilder('Invalid Transaction request');
    }

    storeProc() {
        return new StoreProcedure(this);
    }

    onUpdate(realtimeConfig) {
        var socketEnabled = privateApi.getConfigData('enableSocket', this.name);
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
        return new connector(config, this._isExisting);
    }

    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        return privateApi.closeDB(this.name, flag);
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
                    alias: tables[tblName].alias || '',
                    policies: (tables[tblName].policies || {
                        read: ['*'],
                        write: ['*']
                    })
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
        var response = { message: "Unable to drop DB, either invalid flag or no priviledge granted", errorCode: 401 };
        if (flag) {
            response = privateApi.removeDB(db || this.name, localOnly);
        }

        return response;
    };

    /**
     * perform many transaction in one command
     * {
     *  type: "insert|update|delete",
     *  data: Object|Array,
     *  query: Object|string<jQL>,
     *  table: 'Table Name',
     *  hardInsert: boolen
     * }[]
     * @param {*} transactions 
     * @returns 
     */
    batchTransaction(transactions) {
        return new Promise((resolve, reject) => {
            if (!transactions || !isarray(transactions)) {
                throw new TransactionErrorEvent('BatchTransaction', 'nothing to commit or invalid transaction format');
            }

            var tx = this.transaction(transactions.map(tx => tx.table), "write");
            function performTransaction(transaction) {
                if (isequal(transaction.type, "insert")) {
                    tx.insert(transaction.data, transaction.hardInsert, transaction.table);
                } else if (isequal(transaction.type, "update")) {
                    tx.update(transaction.data, transaction.query, transaction.table);
                } else if (isequal(transaction.type, "delete")) {
                    tx.delete(transaction.query, transaction.table);
                }
            }

            // perform transactions
            transactions.forEach(performTransaction);
            var error = tx.getError();
            var time = performance.now();
            var ret = {
                state: "batch",
                result: {
                    message: "Batch transaction complete"
                }
            };

            var final = passed => txRes => {
                ret.result.transactions = txRes;
                ret.timing = performance.now() - time;
                if (!passed) return reject(ret);
                // process syncing
                this.syncAll().then(
                    sync => resolve(Object.assign(ret.result, { sync })),
                    sync => reject(Object.assign(ret.result, { sync }))
                );
            };

            /**
             * check if queries contains error
             */
            if (error.length) {
                ret.result.message = error.join('\n');
                reject(ret);
                tx.cleanup();
            } else {
                tx.execute(false, true).then(final(true), final(false));
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
                privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.RENAME_DATABASE, [dbName, newName, () => {
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

        function extractTableSchema(tableName) {
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
                if (table == 'all') {
                    var tableNames = privateApi.getDBTableNames(name);
                    for (var tableName of tableNames) {
                        if (!extractTableSchema(tableName)) {
                            notFound = true;
                            console.log('Failed to extract ' + tableName + ', schema configuration not found');
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
        function processJQL(data, resolve) {
            var total = data.length;
            var start = 0;
            var result = {
                messages: []
            };

            function process() {
                if (isequal(total, start)) {
                    return resolve(dbSuccessPromiseObject('import', "Completed without errors"));
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

        return new Promise((resolve, reject) => {
            handler = Object.assign({
                onSuccess: function (jdbSchemaData) {
                    handler.logService('Writing DB schemas');
                    // start JQL imortation
                    if (typeof jdbSchemaData == 'string')
                        return processJQL(jdbSchemaData, resolve);

                    handler.logService('SchemaData:' + JSON.stringify(jdbSchemaData, null, 3));
                    var schemaProcess = new CoreSchemaProcessService(db);
                    // process the schemaData 
                    // when insert data mode
                    if (Array.isArray(jdbSchemaData) && table && !isSchema) {
                        jdbSchemaData = {
                            [table]: {
                                type: 'crud',
                                transactions: [{
                                    type: 'insert',
                                    data: jdbSchemaData
                                }]
                            }
                        };
                    }

                    schemaProcess.process(jdbSchemaData, function () {
                        schemaProcess.processCrud(logs => {
                            handler.logService('Crud Logs:');
                            while (logs.length) {
                                var log = logs.shift();
                                handler.logService(JSON.stringify(log, null, 3));
                            }

                            resolve(dbSuccessPromiseObject('import', "Completed without errors"));
                        })
                    });
                },

                onError: function (err) {
                    handler.logService(err);
                    reject(dbErrorPromiseObject("Completed with errors"));
                },
                unSelect: noFileSelected => {
                    if (noFileSelected)
                        reject(dbErrorPromiseObject('No file selected'));
                },
                logService: function (msg) {
                    errorBuilder(msg)
                },
                onSelect: function () { },
            }, handler || {});

            return AutoSelectFile.start(handler);
        });
    }

    jQl(tasks, handler, params) {
        if (handler)
            console.warn('Support for handler is deprecated and will be removed in next release.');

        handler = handler || {};
        return new Promise((resolve, reject) => {
            handler.onSuccess = handler.onSuccess || resolve;
            handler.onError = handler.onError || reject;
            /**
             * convert to tasks to allow
             */
            if (Array.isArray(tasks)) {
                tasks = tasks.filter(task => !!task);
                startMultipleTask(this);
            } else {
                performTask(tasks, handler, this);
            }
        });

        /**
         * @param {*} taskToPerform 
         * @param {*} taskPerformerHandler 
         * @param {*} context 
         * @param {*} response 
         */
        function performTask(taskToPerform, taskPerformerHandler, context, response) {
            var task = QueryBuilder.queryParser(taskToPerform, params, response);
            var taskType = task[0].toLowerCase();
            var taskPerformerObj = Database.plugins.get(taskType);

            /**
             * pardon failed handler definition
             */

            if (task && taskPerformerObj) {
                if (taskPerformerObj.disabled) {
                    taskPerformerHandler.error(dbErrorPromiseObject("command is disabled, to use command please enable it."));
                } else if (taskPerformerObj.requiresParam && taskType.length < 2) {
                    taskPerformerHandler.error(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
                } else {
                    const collectValue = key => {
                        if(typeof key == 'object'){
                            if (key.startsWith){
                                return task.reduce((accum, v) => {
                                    if (typeof v == 'string' && v.startsWith(key.startsWith)){
                                        accum.push(v)
                                    }
    
                                    return accum;
                                }, []);
                            } else if (key.slice){
                                return task.splice(key.slice.start, (key.slice.end || task.length))
                            }
                        }

                        return key;
                    }
                    // map the query to the mapper object
                    if (taskPerformerObj.map) {
                        task = Object.keys(taskPerformerObj.map)
                            .reduce((accum, key) => {
                                const mValue = taskPerformerObj.map[key];
                                return (accum[key] = (typeof mValue == 'number' ? jSonParser(task[mValue]) : collectValue(mValue)), accum);
                            }, {});
                    }

                    try {
                        taskPerformerObj.fn(task, taskPerformerHandler)(context);
                    } catch (e) {
                        taskPerformerHandler.onError(e);
                    }
                }
            } else {
                taskPerformerHandler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
            }
        }
        /**
         * 
         * @param {*} context 
         */
        function startMultipleTask(context) {
            var index = 0;
            var taskPerformerHandler = Object({
                onSuccess: next,
                onError: next
            });
            var responses = [];
            function next(res) {
                index++;
                responses.push(res);
                if (tasks.length > index) {
                    performTask(tasks[index], taskPerformerHandler, context, res);
                } else {
                    handler.onSuccess(responses);
                }
            }

            performTask(tasks[index], taskPerformerHandler, context);
        }
    }

    syncAll(stopOnFailedTransaction) {
        var ignoreSync = privateApi.getConfigData('ignoreSync', this.name);
        var recordResolver = privateApi.getActiveDB(this.name).get(constants.RECORDRESOLVERS);
        var transactions = recordResolver.getAllPendingWithTables(ignoreSync);
        var requestParams = privateApi.buildHttpRequestOptions(this.name, { path: '/database/push/many' });
        requestParams.data = {
            transactions,
            stopOnFailedTransaction
        };
        if (!Object.keys(transactions).length) return Promise.resolve({ message: 'Nothing to Sync' });

        return privateApi.$http(requestParams, this.name)
            .then(res => {
                Object.keys(res).forEach(tbl => {
                    var tableRes = res[tbl];
                    recordResolver.isResolved(tbl, tableRes._hash)
                        .handleFailedRecords(tbl, tableRes.failed);
                });
                return res;
            }, err => err);
    }

    sync(config) {
        return new Promise((resolve, reject) => {
            var connector = this.getConnector('sync-connector', { name: this.name, version: this.version });
            if (!connector) return reject('Failed to laod sync connector');

            connector
                .Entity(config.table)
                .configSync(null, config.force, config.syncData)
                .processEntity({
                    onSuccess: resolve,
                    onError: reject
                });
        })
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
        return privateApi.closeDB(this.name, flag);
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
        return privateApi.closeDB(this.name, flag);
    }
}

