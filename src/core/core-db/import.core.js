/**
 * @param {*} table
 * @param {*} handler
 */

DBEvent.prototype.import = function(table, handler) {
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
    handler = handler || _def;
    if (table && $isString(table)) {
        if (!$queryDB.$getActiveDB(this.name).$get('$tableExist')(table)) {
            createTable = true;
            if (handler.logService) {
                handler.logService('Table(' + table + ') was not found!!');
            }
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
        function insertData(data) {
            //DB Transaction
            //Write Data to TABLE
            db.transaction(table, 'writeonly')
                .onSuccess(function(res) {
                    res
                        .result
                        .insert.apply(res.result, data)
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

        this.onSuccess = function(data) {
            handler.logService('Imported ' + data.data.length + " records");
            if (data.skippedData.length) {
                handler.logService('Skipped ' + data.skippedData.length + " records");
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
                        insertData(data.data);
                    })
                    .onError(function(res) {
                        handler.logService(res.message)
                    })
            } else {
                //insert the data into the data
                checkColumns(data.columns, data.data[0]);
                insertData(data.data);
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

    return new jFileReader().start(new importHandler());
};