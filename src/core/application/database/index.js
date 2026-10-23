class BaseInstance {
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
        if (options.data instanceof FormData) {
            httpRequestOptions.contentType = false;
            httpRequestOptions.processData = false;
        }

        return privateApi.$http(httpRequestOptions).then(
            res => dbSuccessPromiseObject('api', res),
            err => Promise.reject(err || { message: "There was an error please try again later" })
        );
    }

    /**
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
            for (const tblName in tables) {
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
     * @param {*} tasks 
     * @param {*} handler 
     * @param {*} params 
     * @returns 
     */
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
                performTask(tasks, withSchemaRetry(handler, this), this);
            }
        });

        // a write rejected for an unknown column on a server-schema DB reloads that table's schema and runs once more -
        // the column may have been added on the server since this browser cached the schema
        function withSchemaRetry(taskHandler, context) {
            if (!privateApi.getConfigData('useFrontendOnlySchema', context.name)) return taskHandler;
            return Object.assign({}, taskHandler, {
                onError: err => {
                    const table = unknownColumnTable(err);
                    if (!table) return taskHandler.onError(err);
                    refreshTableSchemas(context.name, context.version, [table])
                        .then(refreshed => refreshed.length ? performTask(tasks, taskHandler, context) : taskHandler.onError(err),
                            () => taskHandler.onError(err));
                }
            });
        }

        function unknownColumnTable(err) {
            const logs = (err && err.error && err.error.logs) || [];
            for (const log of logs) {
                const match = /column \((.+?)\) was not found on this table \((.+?)\)/.exec(String(log));
                if (match) return match[2];
            }
            return null;
        }

        /**
         * throws if `value` doesn't match `type`; otherwise returns it
         * unchanged. Only called once a value actually exists (undefined/
         * default handling happens before this), so there's no "missing
         * value" case to worry about here.
         * @param {*} type
         * @param {*} value
         * @param {*} fieldName
         */
        function validateTypedValue(type, value, fieldName) {
            const bad = () => {
                throw new Error("field '" + fieldName + "' expected " + type + ", got " + JSON.stringify(value));
            };

            switch (type) {
                case 'number':
                    if (typeof value != 'number') bad();
                    break;
                case 'boolean':
                    if (typeof value != 'boolean') bad();
                    break;
                case 'object':
                    if (!isobject(value)) bad();
                    break;
                case 'array':
                    if (!isarray(value)) bad();
                    break;
            }

            return value;
        }

        /**
         * resolves + type-checks a single field from a raw string token
         * (shared by V1 position-based and V2 name-based resolution, since
         * both start from an unparsed string). `type: 'string'` skips
         * jSonParser entirely -- a table named "123" must stay the string
         * "123", not silently become the number 123.
         * @param {*} def
         * @param {*} raw
         * @param {*} fieldName
         */
        function resolveTypedValue(def, raw, fieldName) {
            if (raw === undefined) return def.default;
            if (def.type == 'string') return String(raw);
            const value = jSonParser(raw);
            return def.type ? validateTypedValue(def.type, value, fieldName) : value;
        }

        /**
         * resolve a schema-declared plugin's fields from an already-tokenized
         * string query (array form, index 0 is the command name)
         * @param {*} schema
         * @param {*} rawTask
         */
        function resolveSchemaFromTokens(schema, rawTask) {
            const values = rawTask.slice(1);
            return Object.keys(schema).reduce((accum, key) => {
                const def = schema[key];
                if ('const' in def) {
                    accum[key] = def.const;
                } else if (def.flag) {
                    accum[key] = values.some(v => typeof v == 'string' && v.toLowerCase() === key.toLowerCase());
                } else if (def.rest) {
                    const slice = values.slice(def.position - 1);
                    accum[key] = def.raw ? slice : slice.map(v => jSonParser(v));
                } else {
                    accum[key] = resolveTypedValue(def, values[def.position - 1], key);
                }
                return accum;
            }, {});
        }

        /**
         * resolve a schema-declared plugin's fields from a canonical object task
         * e.g. { command: 'insert', table: 'users', data: {...}, ignoreSync: true }
         * @param {*} schema
         * @param {*} taskObject
         */
        function resolveSchemaFromObject(schema, taskObject) {
            return Object.keys(schema).reduce((accum, key) => {
                const def = schema[key];
                const value = taskObject[key];
                if ('const' in def) {
                    accum[key] = def.const;
                } else if (def.flag) {
                    accum[key] = !!value;
                } else if (value === undefined) {
                    accum[key] = def.default;
                } else if (def.type == 'string') {
                    accum[key] = typeof value == 'string' ? value : String(value);
                } else {
                    accum[key] = def.type ? validateTypedValue(def.type, value, key) : value;
                }
                return accum;
            }, {});
        }

        /**
         * resolve a schema-declared plugin's fields from a V2 query
         * (`command --name=value --flag`), already split into a flat
         * { name: value|true } map by QueryBuilder.parseV2.
         *
         * V2 has no positional concept, so `position` is ignored here --
         * fields are looked up by their own schema key instead. A field
         * marked `rest: true` collects every flag NOT explicitly declared
         * in the schema, reformatted as "name(value)" strings so existing
         * raw-token consumers (e.g. QueryBuilder.buildSelectQuery, used by
         * the 'select' plugin) don't need to change to understand V2 input.
         * There's no positional equivalent for a rest field's *order*, so
         * this only makes sense for schemas whose rest field is itself a
         * bag of independently-named clauses (like 'select'); a plugin
         * whose rest args are meaning-by-position (like 'alter') will not
         * resolve correctly from V2 input yet.
         * @param {*} schema
         * @param {*} flags
         */
        function resolveSchemaFromNamedTokens(schema, flags) {
            const declaredNames = Object.keys(schema);
            const restKey = declaredNames.find(key => schema[key].rest);

            const task = declaredNames.reduce((accum, key) => {
                const def = schema[key];
                if (def.rest) return accum;
                if ('const' in def) {
                    accum[key] = def.const;
                } else if (def.flag) {
                    accum[key] = key in flags;
                } else {
                    const raw = flags[key];
                    accum[key] = resolveTypedValue(def, raw === true ? undefined : raw, key);
                }
                return accum;
            }, {});

            if (restKey) {
                task[restKey] = Object.keys(flags)
                    .filter(name => !declaredNames.includes(name))
                    .map(name => flags[name] === true ? name : `${name}(${flags[name]})`);
            }

            return task;
        }

        /**
         * @param {*} taskToPerform
         * @param {*} taskPerformerHandler
         * @param {*} context
         * @param {*} response
         */
        function performTask(taskToPerform, taskPerformerHandler, context, response) {
            try {
                const isObjectTask = isobject(taskToPerform);
                // a task can be a function of the previous task's response
                // (chained multi-task queries); resolve that once, up front,
                // so both the V1 and V2 parsers see a plain string
                const queryStr = isObjectTask ? null :
                    (typeof taskToPerform == 'function' ? taskToPerform(response) : taskToPerform);

                const isV2 = !isObjectTask && QueryBuilder.isV2Query(queryStr);
                const v2 = isV2 ? QueryBuilder.parseV2(queryStr, params) : null;
                const rawTask = (!isObjectTask && !isV2) ? QueryBuilder.queryParser(queryStr, params) : null;

                const taskType = (isObjectTask ? (taskToPerform.command || '') : (isV2 ? v2.command : (rawTask[0] || ''))).toLowerCase();
                const taskPerformerObj = Database.plugins.get(taskType);

                if (!taskPerformerObj) {
                    return taskPerformerHandler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
                }

                if (taskPerformerObj.disabled) {
                    return taskPerformerHandler.onError(dbErrorPromiseObject("command is disabled, to use command please enable it."));
                }

                const providedParamCount = isObjectTask ? Object.keys(taskToPerform).length :
                    isV2 ? Object.keys(v2.flags).length + 1 : rawTask.length;
                if (taskPerformerObj.requiresParam && providedParamCount < 2) {
                    return taskPerformerHandler.onError(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
                }

                let task;
                if (taskPerformerObj.schema) {
                    task = isObjectTask ? resolveSchemaFromObject(taskPerformerObj.schema, taskToPerform) :
                        isV2 ? resolveSchemaFromNamedTokens(taskPerformerObj.schema, v2.flags) :
                        resolveSchemaFromTokens(taskPerformerObj.schema, rawTask);
                    task.command = taskType;
                } else {
                    task = isObjectTask ? taskToPerform : (isV2 ? v2.flags : rawTask);
                }

                taskPerformerObj.fn(task, taskPerformerHandler)(context);
            } catch (e) {
                taskPerformerHandler.onError(e);
            }
        }
        /**
         * 
         * @param {*} context 
         */
        function startMultipleTask(context) {
            let index = 0;
            const taskPerformerHandler = Object({
                onSuccess: next,
                onError: next
            });

            const responses = [];
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
}



/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
class DatabaseInstance extends BaseInstance {
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
        super();
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
    }

    table(tableName, mode) {
        //get the requested table
        var tableInstance = TableInstance.factory.add(this.name, tableName, mode);
        if (!tableInstance) {
            errorBuilder(`There was an error, Table (${tableName}) was not found on this DB (${this.name}`);
        }

        return tableInstance;
    }

    truncate(syncToServer) {
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
                this.api({ path: '/v2/database/truncate' })
                    .then(res => resolve(dbSuccessPromiseObject('truncateDB', res.result)), err => reject(dbErrorPromiseObject('truncateDB', err)))
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
                columns = [columns];
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
        const socketEnabled = privateApi.getConfigData('enableSocket', this.name);
        const _realtimeConfig = Object.assign({
            type: 'db',
            dbName: this.name,
            socketEnabled: socketEnabled
        }, realtimeConfig || {});

        const connector = this.getConnector('realtime-connector', _realtimeConfig);
        return connector;
    };



    getConnector(name, config) {
        const connector = Database.connectors.use(name);
        return new connector(config, this._isExisting);
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
    batchTransaction(transactions, rollBackOnError = false) {
        return new Promise((resolve, reject) => {
            if (!transactions || !isarray(transactions)) {
                throw new TransactionErrorEvent('BatchTransaction', 'nothing to commit or invalid transaction format');
            }

            const tx = this.transaction(transactions.map(tx => tx.table), "write");
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
            const error = tx.getError();
            const time = performance.now();
            const ret = {
                state: "batch",
                result: {
                    message: "Batch transaction complete"
                }
            };

            const final = passed => txRes => {
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
                tx.execute(false, true, rollBackOnError).then(final(true), final(false));
            }
        });

    }

    rename(newName) {
        const dbName = this.name;
        return new Promise((resolve, reject) => {
            /**
             * 
             * @param {*} res 
             */
            const renameClient = (res) => {
                privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.RENAME_DATABASE, [dbName, newName, () => {
                    // set the new name 
                    this.name = newName;
                    privateApi.databaseContainer.rename(dbName, newName);
                    resourceInstance.renameResource(newName);
                    resolve(res);
                }]);
            };

            const resourceInstance = privateApi.getActiveDB(dbName).get(constants.RESOURCEMANAGER);
            if (isequal(dbName, newName)) {
                failed({ message: newName + ' cannot be same as ' + dbName });
            } else {
                const resource = resourceInstance.getResource();
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
        type = type || 'csv';
        const exp = jExport.handlers[type](title || this.name, table == 'all');
        const name = this.name;

        function extractTableSchema(tableName) {
            const tableSchema = privateApi.getTable(name, tableName);
            if (!tableSchema) return false;
            const tableData = privateApi.getTableData(name, tableName);
            //if export type was a JSON format
            if (['json', 'jql'].includes(type)) {
                //put the json data
                exp.put(tableSchema, tableData);
            } else {
                //set label
                exp.put(tableName, Object.keys((tableSchema.columns[0] || {})).map(n => `${n}:${tableSchema.columns[0][n].type}`), tableData);
            }

            return true;
        }

        return ({
            initialize: () => {
                var notFound = false;
                // export all table schematics and data
                const skippedTables = [];
                if (table == 'all') {
                    var tableNames = privateApi.getDBTableNames(name);
                    for (var tableName of tableNames) {
                        if (!extractTableSchema(tableName)) {
                            skippedTables.push(tableName);
                        }
                    }
                } else {
                    notFound = !extractTableSchema(table);
                }

                //Parse the data of its not an OBJECT
                if (notFound) {
                    return dbErrorPromiseObject("unable to generate export, empty or invalid table provided");
                }

                if (skippedTables.length){
                    console.log(`Failed to extract ${skippedTables}, schema(s) configuration not found`);
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
     * @param {*} handler { logService, onSelect, skipExisting (default true) }
     * @returns
     */
    import(table, isSchema = true, handler) {
        handler = Object.assign({
            logService: () => { },
            onSelect: function () { },
            skipExisting: true
        }, handler || {});

        const db = this;
        const MAX_URL_SIZE = 10 * 1024 * 1024;
        const log = msg => handler.logService(msg);
        const resolveType = name => (String(name || '').split(/[?#]/)[0].split('.').pop() || '').toLowerCase();
        const finish = (journal, resolve) => {
            const errors = journal.errors.length;
            resolve(dbSuccessPromiseObject('import', Object.assign({
                message: errors ? `Completed with ${errors} error(s)` : "Completed without errors"
            }, journal)));
        };

        // command + target table of a JQL statement, from the plugin's declared table position
        function jqlTarget(query) {
            try {
                if (QueryBuilder.isV2Query(query)) {
                    const v2 = QueryBuilder.parseV2(query);
                    return { command: String(v2.command || '').toLowerCase(), table: v2.flags.table || null };
                }

                const tokens = QueryBuilder.queryParser(query) || [];
                const command = String(tokens[0] || '').toLowerCase();
                const plugin = Database.plugins.get(command);
                const position = plugin && plugin.schema && plugin.schema.table && plugin.schema.table.position;
                return { command, table: (position && typeof tokens[position] == 'string') ? tokens[position] : null };
            } catch (e) {
                return { command: '', table: null };
            }
        }

        function planJQL(queries) {
            const created = new Set();
            const skippedTables = new Set();
            return queries.map(query => {
                const { command, table } = jqlTarget(query);
                const exists = !!table && !created.has(table) && privateApi.tableExists(db.name, table);
                let skipped = !!table && skippedTables.has(table);
                if (command == 'create' && table) {
                    if (exists && handler.skipExisting) {
                        skippedTables.add(table);
                        skipped = true;
                    } else if (!exists) {
                        created.add(table);
                    }
                }

                return {
                    table,
                    action: command,
                    exists,
                    skipped,
                    destructive: !skipped && (['drop', 'truncate', 'delete', 'update', 'alter', 'rename'].includes(command) || (command == 'insert' && exists))
                };
            });
        }

        function processJQL(queries, resolve) {
            const journal = { created: [], skipped: [], altered: [], errors: [] };
            const plan = planJQL(queries);
            let start = 0;

            function process() {
                if (start == queries.length) return finish(journal, resolve);
                const step = plan[start];
                let query = queries[start];
                start++;

                if (step.skipped) {
                    if (step.action == 'create') journal.skipped.push(step.table);
                    log(`Line ${start} skipped, table(${step.table}) already exists`);
                    return process();
                }

                if (step.table && journal.created.includes(step.table) && ['insert', 'update', 'delete'].includes(step.action)) {
                    query += ' -ignoreSync';
                }

                db.jQl(query).then(ret => {
                    if (step.action == 'create' && step.table) journal.created.push(step.table);
                    else if (step.table && step.action != 'insert') journal.altered.push(step.table);
                    log(ret.result ? ret.result.message : ret.message);
                    process();
                }, err => {
                    journal.errors.push({ table: step.table, line: start, message: err.message });
                    log(err.message + " on line : " + start);
                    process();
                });
            }

            process();
        }

        function parse(content, type) {
            const importFormatFn = JImportHelper[type];
            if (!type || !importFormatFn) throw new Error("Unsupported File Format");
            let jdbSchemaData = importFormatFn(content);
            if (type == 'jql') return jdbSchemaData;
            if (JImportHelper.isMigration(jdbSchemaData)) return JImportHelper.migration(jdbSchemaData);
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

            if (!isobject(jdbSchemaData)) {
                throw new Error("Unsupported schema format: expected { table: {...} } or a migration file ([{ type, config }])");
            }

            return jdbSchemaData;
        }

        const importSchema = function (content, type, resolve, reject) {
            let jdbSchemaData;
            try {
                jdbSchemaData = parse(content, type);
            } catch (err) {
                return reject(err.message || err);
            }

            log('Writing DB schemas');
            if (Array.isArray(jdbSchemaData)) {
                return processJQL(jdbSchemaData, resolve);
            }

            try {
                const schemaProcess = new CoreSchemaProcessService(db, { skipExisting: handler.skipExisting, log });
                schemaProcess.process(jdbSchemaData, () => {
                    schemaProcess.processCrud((logs, journal) => {
                        log('Crud Logs:');
                        logs.forEach(entry => log(JSON.stringify(entry, null, 3)));
                        finish(journal, resolve);
                    });
                });
            } catch (err) {
                reject(err.message || err);
            }
        };

        const readFile = (file, resolve, reject) => {
            if (file) {
                const reader = new FileReader();
                // Read file into memory as UTF-8
                reader.readAsText(file);
                // Handle errors load
                reader.onload = function (event) {
                    importSchema(event.target.result, resolveType(file.name), resolve, reject);
                };
                reader.onerror = reject;
            } else {
                reject('No file selected');
            }
        };

        const readUrl = (url, type) => {
            let parsed;
            try {
                parsed = new URL(url, location.href);
            } catch (e) {
                return Promise.reject('Invalid URL');
            }

            if (!['http:', 'https:'].includes(parsed.protocol)) return Promise.reject('Only http(s) URLs are supported');
            // public files only: credentials are never sent to third-party hosts
            return fetch(parsed.href, { credentials: 'omit' })
                .then(res => {
                    if (!res.ok) return Promise.reject(`Unable to download file (${res.status})`);
                    if (+res.headers.get('content-length') > MAX_URL_SIZE) return Promise.reject('File is larger than 10MB');
                    return res.text().then(content => {
                        if (content.length > MAX_URL_SIZE) return Promise.reject('File is larger than 10MB');
                        return { content, type: type || resolveType(parsed.pathname) };
                    });
                }, () => Promise.reject('Unable to download file, the host may not allow cross-origin requests'));
        };

        const openFileSelector = (resolve, reject) => {
            let fileSelected = false;
            function eventBinder(e) {
                fileSelected = true;
                const file = this.files[0];
                handler.onSelect(file);
                readFile(file, resolve, reject);
                input.remove();
            }

            const input = document.createElement("input");
            input.type = "file";
            input.multiple = false;
            input.addEventListener('change', eventBinder, false);
            // add styling
            input.style.top = "-10000px";
            input.style.position = "absolute";
            document.body.appendChild(input);
            // attach event to document for focus
            window.onfocus = function () {
                setTimeout(function () {
                    input.removeEventListener('change', eventBinder);
                    input.remove();
                    if (!fileSelected) {
                        reject('No file selected');
                    }
                }, 1000);
            };
            input.click();
        };

        const failed = reject => err => {
            log(err);
            reject(dbErrorPromiseObject((err && err.message) || err || "Completed with errors"));
        };

        return {
            selectFile: () => new Promise((resolve, reject) => openFileSelector(resolve, failed(reject))),
            fromFile: file => new Promise((resolve, reject) => readFile(file, resolve, failed(reject))),
            fromText: (content, type) => new Promise((resolve, reject) => importSchema(content, type, resolve, failed(reject))),
            fromUrl: (url, type) => new Promise((resolve, reject) => {
                readUrl(url, type).then(res => importSchema(res.content, res.type, resolve, failed(reject)), failed(reject));
            }),
            // downloads a URL without importing it, e.g. to preview first
            readUrl,
            // what an import would do, without changing anything
            preview: (content, type) => {
                const jdbSchemaData = parse(content, type);
                return Array.isArray(jdbSchemaData) ? planJQL(jdbSchemaData) :
                    CoreSchemaProcessService.plan(db, jdbSchemaData, handler.skipExisting);
            }
        };
    }

    /**
     * Undo for imported tables: drops tables that were never synced and clears their pending records.
     * Synced tables are left untouched and returned in `kept`.
     * @param {*} tables
     */
    discardLocalTables(tables) {
        const activeDB = privateApi.getActiveDB(this.name);
        const resource = activeDB.get(constants.RESOURCEMANAGER);
        const recordResolver = activeDB.get(constants.RECORDRESOLVERS);
        const result = { discarded: [], kept: [] };
        (tables || []).forEach(tbl => {
            if (!privateApi.tableExists(this.name, tbl)) return;
            if (resource.getTableLastSyncDate(tbl)) {
                result.kept.push(tbl);
                return;
            }

            this.table(tbl).drop(true);
            recordResolver.isResolved(tbl);
            result.discarded.push(tbl);
        });

        return result;
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
            }, err => Promise.reject(err));
    }

    sync(config) {
        return new Promise((resolve, reject) => {
            const connector = this.getConnector('sync-connector', { name: this.name, version: this.version });
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
class DatabaseLoginInstance  extends BaseInstance {
    constructor(name, version) {
        super();
        this.name = name;
        this.version = version;
    }
}

/**
 * Application deleted instance
 * used only when applicated is deleted
 */
class DatabaseDeletedInstance extends BaseInstance {
    constructor(name, version) {
        super();
        this.name = name;
        this.version = version;
    }
}

