/**
 *  process schema
 * {
 *  TBL_NAME: {
 *  "type: "DROP | RENAME | ALTER | TRUNCATE | CREATE | CRUD | CLONE",
 *  "colums: [
 *   {
 *      "type":"",
 *      "column": "",
 *      "definition": {}
 *   }
 *  ]
 *  }
 * }
 */
class CoreSchemaProcessService {
    // sync bookkeeping from an export must not leak into a new table
    static SYNC_KEYS = ['_hash', '_previousHash', 'lastModified', 'lastSyncedDate'];

    /**
     * @param {*} coreInstance
     * @param {*} options { skipExisting: true, log: fn }
     */
    constructor(coreInstance, options) {
        this.options = Object.assign({ skipExisting: true, log: () => { } }, options || {});
        this.crudProcess = new SchemaCrudProcess(coreInstance);
        this.coreInstance = coreInstance;
        this.journal = { created: [], skipped: [], altered: [], errors: [] };
    }

    static plan(coreInstance, data, skipExisting = true) {
        if (!isobject(data)) {
            throw new TypeError('JDBSchema Error: invalid schema dataType');
        }

        return Object.keys(data).map(name => {
            const configs = isarray(data[name]) ? data[name] : [data[name]];
            const exists = privateApi.tableExists(coreInstance.name, name);
            return configs.map(config => {
                const action = String(config.type || '').toLowerCase();
                const crud = action == 'crud' ? config : config.crud;
                const rows = ((crud && crud.transactions) || []).reduce((total, tx) => total + (isarray(tx.data) ? tx.data.length : (tx.data ? 1 : 0)), 0);
                const skipped = !!config.serverOnly || ((action == 'create' || action == 'clone') && exists && skipExisting);
                return {
                    table: name,
                    action,
                    exists,
                    rows: skipped ? 0 : rows,
                    skipped,
                    serverOnly: !!config.serverOnly,
                    destructive: !skipped && (['drop', 'truncate', 'rename', 'alter'].includes(action) || (exists && rows > 0))
                };
            });
        }).reduce((accum, items) => accum.concat(items), []);
    }

    /**
     * @param data
     * @param next
     */
    process(data, next) {
        if (!isobject(data)) {
            throw new TypeError('JDBSchema Error: invalid schema dataType');
        }

        const tables = Object.keys(data);
        let inc = -1;
        const dbName = this.coreInstance.name;
        const fail = (tableName, message) => {
            this.journal.errors.push({ table: tableName, message });
            this.options.log(`[${tableName}] ${message}`);
        };

        const createTable = (tableName, definition, additionalConfig, crud) => {
            if (privateApi.tableExists(dbName, tableName)) {
                if (this.options.skipExisting) {
                    this.journal.skipped.push(tableName);
                    this.options.log(`Table(${tableName}) already exists, skipped with its records`);
                    return;
                }
            } else {
                const config = Object.assign({}, additionalConfig || {});
                CoreSchemaProcessService.SYNC_KEYS.forEach(key => delete config[key]);
                const response = this.coreInstance.createTbl(tableName, definition, config);
                if (response.errorCode) return fail(tableName, response.message);
                this.journal.created.push(tableName);
                this.options.log(response.message);
            }

            // rows for a table the server doesn't have yet stay pending until it is synced
            this.crudProcess.addTask(tableName, crud, this.journal.created.includes(tableName));
        };

        const processRequest = (tableName, conf) => {
            const action = String(conf.type || '').toLowerCase();
            if (conf.serverOnly) {
                this.journal.skipped.push(tableName);
                return this.options.log(`Table(${tableName}) ${conf.type} only runs on the server, skipped`);
            }

            if (action == 'create') {
                return createTable(tableName, conf.definition, conf.additionalConfig, conf.crud);
            }

            if (action == 'crud') {
                return this.crudProcess.addTask(tableName, conf, this.journal.created.includes(tableName));
            }

            const sourceName = action == 'clone' ? conf.from : tableName;
            if (!privateApi.tableExists(dbName, sourceName)) {
                return fail(tableName, `Table(${sourceName}) was not found`);
            }

            const tableInstance = this.coreInstance.table(sourceName);
            if (action == 'clone') {
                return createTable(tableName, Object.assign(tableInstance.columns, conf.definition || {}), null, conf.crud);
            }

            if (action == 'drop') {
                tableInstance.drop(true);
            } else if (action == 'rename') {
                tableInstance.rename(conf.name);
            } else if (action == 'truncate') {
                tableInstance.truncate(true);
            } else if (action == 'alter') {
                (conf.columns || []).forEach(column => {
                    const type = String(column.type).toLowerCase();
                    if (tableInstance.alter.add.hasOwnProperty(type)) {
                        tableInstance.alter.add[type](column.name, column.definition);
                    } else if (typeof tableInstance.alter[type] == 'function') {
                        tableInstance.alter[type](column.name, column.definition);
                    }
                });
            } else {
                return fail(tableName, `Unsupported schema type (${conf.type})`);
            }

            this.journal.altered.push(tableName);
            this.options.log(`Table(${tableName}) ${action} completed`);
        };

        const processNext = () => {
            inc++;
            if (tables.length <= inc) return next(this.journal);
            const tableName = tables[inc];
            const configs = isarray(data[tableName]) ? data[tableName] : [data[tableName]];
            configs.forEach(conf => {
                try {
                    processRequest(tableName, conf || {});
                } catch (err) {
                    fail(tableName, (err && err.message) || String(err));
                }
            });
            processNext();
        };

        processNext();
    };

    processCrud(cb) {
        this.crudProcess.process(logs => {
            logs.filter(log => log.failed).forEach(log => this.journal.errors.push({ table: log.table, message: log.message }));
            cb(logs, this.journal);
        });
    }
}
