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
    };
}

SchemaCrudProcess.prototype.process = function(next) {
    /**
     * check for crudTask before finalizing
     */
    var _this = this,
        tables = Object.keys(this.task);

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
            var query = "",
                mapper = {
                    data: data,
                    table: tableName
                };

            /**
             * insert transaction
             */
            if ($isEqual(conf.type, 'insert')) {
                query = 'insert -%data% -%table%';
                if (conf.skipDataProcessing) {
                    query += " -skip";
                }
            }
            /**
             * update transactions
             */
            else if ($isEqual(conf.type, 'update')) {
                query = 'update -%table% -%data% -%query%';
                mapper.query = conf.query;
            }
            /**
             * delete transactions
             */
            else if ($isEqual(conf.type, 'delete')) {
                query = "delete -%table% -%data%";
            }
            /**
             * batch transactions
             */
            else if ($isEqual(conf.type, 'batch')) {
                query = 'batch -%data%';
            }
            /**
             * insertreplace transactions
             */
            else if ($isEqual(conf.type, 'insertreplace')) {
                query = 'insert -%data% -%table% -replace -%column%';
                if (conf.skipDataProcessing) {
                    query += " -skip";
                }

                mapper.column = conf.column;
            }

            _this.db.jQl(query, {
                onSuccess: nextCRUD,
                onError: nextCRUD
            }, mapper);
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