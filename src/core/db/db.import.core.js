/**
 * @param {*} table
 * @param {*} handler
 */

ApplicationInstance.prototype.import = function(table, handler) {
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
    if (table && $isString(table)) {
        if (!privateApi.$getActiveDB(this.name).$get('$tableExist')(table)) {
            createTable = true;
            handler.logService('Table(' + table + ') was not found!!');
        }
    } else {
        handler.logService('Table is required');
        return false;
    }

    /**
     * import Handler
     */
    function importHandler() {
        //@Fn insertData
        function insertData(data, processData) {
            //DB Transaction
            //Write Data to TABLE
            db.transaction(table, 'writeonly')
                .onSuccess(function(res) {
                    res
                        .result
                        .dataProcessing(processData)
                        .insert(data)
                        .execute()
                        .onSuccess(function(ins) {
                            handler.logService(ins.result.message);
                        })
                        .onError(function(ins) {
                            handler.logService(ins.message);
                        });
                })
                .onError(function(ins) {
                    hanler.logService(ins.message);
                });
        }

        function checkColumns(col, cData) {
            //column checker
            if (col.length) {
                db.table(table)
                    .onSuccess(function(res) {
                        var tblFn = res.result,
                            cols = tblFn.columns;
                        //loop through col
                        for (var c in col) {
                            if (!cols[col[c]]) {
                                tblFn.Alter.add('new').column(col[c], { type: typeof cData[col[c]] });
                            }
                        }
                    });
            }
        }

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

            if (createTable) {
                handler.logService('Creating table: ' + table);
                var tblColumns = data.columns,
                    config = {};

                for (var col in tblColumns) {
                    config[tblColumns[col]] = { type: (typeof data.data[0][tblColumns[col]]) };
                }

                //create the table
                db
                    .createTbl(table, config)
                    .onSuccess(function(res) {
                        handler.logService(res.result.message);
                        insertData(data.data, false);
                    })
                    .onError(function(res) {
                        handler.logService(res.message)
                    })
            } else {
                //insert the data
                checkColumns(data.columns, data.data[0]);
                insertData(data.data, true);
            }

            if (handler.onSuccess) {
                handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
            }
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