/**
 *
 * @param {*} data 
 * @param {*} next 
 * @param {*} crudProcess 
 * @param {*} core 
 *
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
function CoreSchemaProcessService(core) {
    var crudProcess = new SchemaCrudProcess(core);
    /**
     * @param data
     * @param next
     */
    this.process = function(data, next) {
        if (!isobject(data)) {
            throw new TypeError('JDBSchema Error: invalid schema dataType');
        }

        var tables = Object.keys(data),
            inc = -1;

        function startTableProcess() {
            var tableName = tables[inc],
                config = data[tableName];

            /**
             * support for multiple type of config
             */
            if (isequal(config.type, 'create')) {
                core.createTbl(tableName, config.definition, config.additionalConfig);
                /**
                 * check for crud definition in create query
                 */
                pushCrudTask(config.crud, tableName);
            }
            /**
             * Clone a table
             */
            else if (isequal(config.type, 'clone')) {
                OtherProcess(config.from);
            } else if (isequal(config.type, 'crud')) {
                pushCrudTask(config, tableName);
            } else {
                OtherProcess(tableName);
            }

            function OtherProcess(tbl) {
                core.table(tbl)
                    .then(function(tx) {
                        var tableInstance = tx.result;
                        if (isarray(config)) {
                            config.forEach(function(conf) {
                                processRequest(tableInstance, conf);
                            });
                        } else {
                            processRequest(tableInstance, config);
                        }
                        processNext();
                    }, processNext);
            }
            /**
             * 
             * @param {*} tableInstance 
             * @param {*} conf 
             */
            function processRequest(tableInstance, conf) {
                if (isequal(conf.type, 'drop')) {
                    tableInstance.drop(tableName);
                } else if (isequal(conf.type, 'rename')) {
                    tableInstance.rename(conf.name);
                } else if (isequal(conf.type, 'truncate')) {
                    tableInstance.truncate(true);
                } else if (isequal(conf.type, 'alter')) {
                    conf.columns.forEach(function(column) {
                        var type = column.type.toLowerCase();
                        /**
                         * drop case
                         */
                        if (tableInstance.alter.add.hasOwnProperty(type)) {
                            tableInstance.alter.add[type](column.name, column.definition);
                        } else if (tableInstance.alter.hasOwnProperty(type)) {
                            tableInstance.alter[type](column.name, column.definition);
                        }
                    });
                } else if (isequal(conf.type, 'clone')) {
                    var definition = extend(true, tableInstance.columns(), conf.definition || {});
                    /**
                     * create the table
                     */
                    core.createTbl(tableName, definition)
                        .then(function(tx) {
                            pushCrudTask(config.crud, tableName);
                        }, processNext);

                }
            }
        }

        /**
         * 
         * @param {*} config 
         * @param {*} table 
         */
        function pushCrudTask(config, table) {
            crudProcess.addTask(table, config);
            processNext();
        }


        function processNext() {
            inc++;
            if (tables.length > inc) {
                startTableProcess();
            } else {
                next();
            }
        }

        processNext();
    };

    this.processCrud = function(cb) {
        crudProcess.process(cb);
    };

}