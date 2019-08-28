/**
 * 
 * @param {*} core 
 * @param {*} currentVersion 
 * @param {*} previousVersion 
 * @param {*} schemaFilePath 
 */
function SchemaManager(core, currentVersion, previousVersion, schemaFilePath) {
    var crudProcess = new SchemaCrudProcess(core);
    /**
     * load schema
     */
    function loadSchema(version) {
        var path = schemaFilePath + "version_" + version + '.json';
        return privateApi.$http(path);
    }

    this.create = function(next) {
        /**
         * check if schemaFilePath is Defined
         * 
         */
        if (!schemaFilePath || !$isString(schemaFilePath)) {
            return next();
        }

        var _this = this;
        loadSchema(1)
            .then(function(schema) {
                processSchema(schema, function() {
                    /**
                     * Trigger the upgrade on create mode
                     * As this fixes the issue of lost data when table is altered in websql
                     */
                    _this.upgrade(next);
                });
            }, next);
    };

    this.upgrade = function(cb) {
        function performUpgrade() {
            previousVersion++;
            loadSchema(previousVersion)
                .then(function(schema) {
                    processSchema(schema, next);
                }, next);
        }

        function next() {
            if (currentVersion > previousVersion) {
                performUpgrade();
            } else {
                crudProcess.process(cb);
            }
        }

        next();
    };


    /**
     * process schema
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
    function processSchema(data, next) {
        if (!$isObject(data)) {
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
            if ($isEqual(config.type, 'create')) {
                core.createTbl(tableName, config.definition);
                /**
                 * check for crud definition in create query
                 */
                pushCrudTask(config.crud, tableName);
            }
            /**
             * Clone a table
             */
            else if ($isEqual(config.type, 'clone')) {
                OtherProcess(config.from);
            } else if ($isEqual(config.type, 'crud')) {
                pushCrudTask(config, tableName);
            } else {
                OtherProcess(tableName);
            }

            function OtherProcess(tbl) {
                core.table(tbl)
                    .then(function(tx) {
                        var tableInstance = tx.result;
                        if ($isArray(config)) {
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
                if ($isEqual(conf.type, 'drop')) {
                    tableInstance.drop(tableName);
                } else if ($isEqual(conf.type, 'rename')) {
                    tableInstance.rename(conf.name);
                } else if ($isEqual(conf.type, 'truncate')) {
                    tableInstance.truncate(true);
                } else if ($isEqual(conf.type, 'alter')) {
                    conf.columns.forEach(function(column) {
                        var type = column.type.toLowerCase();
                        /**
                         * drop case
                         */
                        if (tableInstance.Alter.add.hasOwnProperty(type)) {
                            tableInstance.Alter.add[type](column.name, column.definition);
                        } else if (tableInstance.Alter.hasOwnProperty(type)) {
                            tableInstance.Alter[type](column.name, column.definition);
                        }
                    });
                } else if ($isEqual(conf.type, 'clone')) {
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
    }
}

/**
 * Load resource from frontendonly
 */
SchemaManager.prototype.loadFromServer = SeverSchemaLoader;