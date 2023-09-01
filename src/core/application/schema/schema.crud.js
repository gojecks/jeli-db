/**
 * 
 * @param {*} core 
 */
function SchemaCrudProcess(core) {
    this.task = {};
    this.db = core;

    this.addTask = function(table, definition) {
        if (definition && table) {
            if (this.task.hasOwnProperty(table)) {
                this.task[table].transactions.push.apply(this.task[table].transactions, definition.transactions);
            } else {
                this.task[table] = definition;
            }
        }
    }
}

SchemaCrudProcess.prototype.process = function(next) {
    /**
     * check for crudTask before finalizing
     */
    var _this = this;
    var tables = Object.keys(this.task);

    function processNext() {
        if (tables.length) {
            var tableName = tables.shift();
            processCRUD(tableName, _this.task[tableName]);
        } else {
            next();
        }
    }


    /**
     * 
     * @param {*} current 
     */
    function processCRUD(tableName, current) {
        var conf = current.transactions.shift();
        if (!conf) {
            return processNext();
        }

        if (conf.filePath) {
            privateApi.$http(conf.filePath)
                .then(performCrud, function(res) {
                    nextCRUD({
                        message: "Failed for (" + tableName + ") table: unable to retrieve data from: " + conf.filePath,
                        status: res.status
                    });
                });
        } else if (conf.data || conf.query) {
            performCrud(conf.data || conf.query);
        } else if (conf.replicate && conf.replicate.table) {
            var query = "select -* -%table%";
            if (conf.replicate.query) {
                query += " -where(%query%)";
            }
            /**
             * query the DB and insert the records
             */
            _this.db.jQl(query, {
                onSuccess: function(res) {
                    performCrud(res.getResult());
                },
                onError: nextCRUD
            }, conf.replicate);
        } else {
            nextCRUD({
                message: "No task to perform"
            });
        }

        /**
         * 
         * @param {*} data 
         */
        function performCrud(data) {
            var query = {
                insert: 'insert -%1% -%0%',
                update: 'update -%0% -%1% -%2%',
                delete: "delete -%0% -%1%",
                batch: 'batch -%data%',
                insertreplace: 'insert -%1% -%0% -replace -%2%'
            }[conf.type];

            if (conf.skipDataProcessing) {
                query += " -skip";
            }

            _this.db.jQl(query, {
                onSuccess: nextCRUD,
                onError: nextCRUD
            }, [tableName, data, conf.column || conf.query]);
        }

        function nextCRUD(res) {
            console.group("JDB CRUD");
            console.log(res);
            console.groupEnd();
            processCRUD(tableName, current);
        }
    }

    processNext();
};