/**
 *
 * @param {*} core
 */
class SchemaCrudProcess{
    constructor(core) {
        this.task = {};
        this.localOnly = {};
        this.db = core;
    }

    /**
     * @param {*} table
     * @param {*} definition
     * @param {*} localOnly keep the rows pending (no live push) until the table is synced
     */
    addTask(table, definition, localOnly) {
        if (definition && table) {
            if (localOnly) this.localOnly[table] = true;
            if (this.task.hasOwnProperty(table)) {
                this.task[table].transactions.push.apply(this.task[table].transactions, definition.transactions || []);
            } else {
                this.task[table] = {
                    transactions: (definition.transactions || []).slice()
                };
            }
        }
    }

    process(next) {
        var tables = Object.keys(this.task);
        var logs = [];
        var processNext = () => {
            if (tables.length) {
                processCRUD(tables.shift());
            } else {
                next(logs);
            }
        };

        /**
         *
         * @param {*} data
         * @param {*} conf
         * @param {*} tableName
         */
        var performCrud = (data, conf, tableName) => {
            var query = {
                insert: 'insert -%1% -%0%',
                update: 'update -%0% -%1% -%2%',
                delete: "delete -%0% -%1%",
                batch: 'batch -%data%',
                insertreplace: 'insert -%1% -%0% -replace -%2%'
            }[String(conf.type).toLowerCase()];

            if (!query) {
                return nextCRUD({ message: `Unsupported transaction type (${conf.type})` }, tableName, true);
            }

            if (conf.skipDataProcessing) {
                query += " -skip";
            }

            if (this.localOnly[tableName]) {
                query += " -ignoreSync";
            }

            this.db.jQl(query, null, [tableName, data, conf.column || conf.query])
            .then(res => nextCRUD(res, tableName), res => nextCRUD(res, tableName, true));
        }

        /**
         *
         * @param {*} res
         * @param {*} tableName
         * @param {*} failed
         */
        var nextCRUD = (res, tableName, failed) => {
            logs.push(Object.assign({ table: tableName, failed: !!failed }, res && typeof res == 'object' ? res : { message: String(res) }));
            processCRUD(tableName);
        };

        /**
         *
         * @param {*} tableName
         */
        var processCRUD = (tableName)  => {
            var conf = this.task[tableName].transactions.shift();
            if (!conf)
                return processNext();

            if (conf.filePath) {
                this.fetch(conf.filePath)
                    .then(data => performCrud(data, conf, tableName), res => {
                        nextCRUD({
                            message: "Failed for (" + tableName + ") table: unable to retrieve data from: " + conf.filePath,
                            status: res && res.status
                        }, tableName, true);
                    });
            } else if (conf.data || conf.query) {
                performCrud((conf.data || conf.query), conf, tableName);
            } else if (conf.replicate && conf.replicate.table) {
                var query = "select -* -%table%";
                if (conf.replicate.query) {
                    query += " -where(%query%)";
                }
                /**
                 * query the DB and insert the records
                 */
                this.db.jQl(query, null, conf.replicate)
                .then(res => performCrud(res.getResult(), conf, tableName), res => nextCRUD(res, tableName, true));
            } else {
                nextCRUD({
                    message: "No task to perform"
                }, tableName);
            }
        }

        processNext();
    }

    // public data files only: no credentials are sent to third-party hosts
    fetch(url) {
        return fetch(url, { credentials: 'omit' }).then(res => res.ok ? res.json() : Promise.reject(res));
    }
}
