/**
 * @param {*} table
 * @param {*} isSchema
 * @param {*} handler
 */

function ApplicationInstanceImport(table, isSchema, handler) {
    var createTable = false,
        db = this,
        _def = ({
            logService: function(msg) {
                errorBuilder(msg)
            },
            onSelect: function() {},
            onSuccess: function() {},
            onError: function() {}
        });

    //check if handler
    handler = extend(true, _def, handler || {});
    if (!isSchema) {
        if (table && $isString(table)) {
            if (!privateApi.tableExists(this.name, table)) {
                createTable = true;
                handler.logService('Table(' + table + ') was not found!!');
            }
        } else {
            handler.logService('Table is required');
            return false;
        }
    }

    /**
     * import Handler
     */
    function importHandler() {
        function processJQL(data) {
            var total = data.length,
                start = 0,
                result = {
                    messages: []
                };
            process();

            function process() {
                if ($isEqual(total, start)) {
                    return handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
                }

                var query = data[start];
                start++;

                db.jQl(query, {
                    onSuccess: function(ret) {
                        handler.logService(ret.result.message);
                        process();
                    },
                    onError: function(err) {
                        handler.logService(err.message + " on line : " + start);
                        process();
                    }
                });
            }
        }

        this.onSuccess = function(data) {
            handler.logService('Imported ' + data.data.length + " records");
            if (data.skippedData.length) {
                handler.logService('Skipped ' + data.skippedData.length + " records");
            }

            if ($isEqual(data._type, "jql")) {
                return processJQL(data.data)
            }

            if (!isSchema) {
                data.schema[table] = {
                    type: "create",
                    crud: {
                        transaction: [{
                            type: "insert",
                            data: data.data
                        }]
                    }
                };

                if (createTable) {
                    handler.logService('Creating table: ' + table);
                    data.schema[table].definition = [data.columns.reduce(function(accum, name) {
                        accum[name] = {
                            type: (typeof data.data[0][data.columns[name]])
                        };

                        return accum;
                    }, {})];
                } else {
                    data.schema[table].type = "alter";
                    data.schema[table].columns = data.columns.map(function(name) {
                        return {
                            type: "column",
                            name: name,
                            definition: {
                                type: (typeof data.data[0][data.columns[name]])
                            }
                        };
                    });
                }
            }



            var schemaProcess = new CoreSchemaProcessService(db);
            schemaProcess.process(data.schema, function() {
                handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
            });
        };

        this.onError = function(err) {
            handler.logService(err);
            handler.onError(dbErrorPromiseObject("Completed with errors"));
        };

        if (handler.onselect) {
            this.onselect = handler.onselect;
        }
    }

    return new AutoSelectFile(importModules).start(new importHandler());
};