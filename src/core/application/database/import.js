/**
 * @param {*} table
 * @param {*} isSchema
 * @param {*} handler
 */

function DatabaseInstanceImport(table, isSchema, handler) {
    var createTable = false;
    var db = this;
    //check if handler
    handler = Object.assign({
        logService: function (msg) {
            errorBuilder(msg)
        },
        onSelect: function () { },
        onSuccess: function () { },
        onError: function () { }
    }, handler || {});

    function processJQL(data) {
        var total = data.length;
        var start = 0;
        var result = {
            messages: []
        };

        function process() {
            if (isequal(total, start)) {
                return handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
            }

            var query = data[start];
            start++;

            db.jQl(query).then(function (ret) {
                handler.logService(ret.result.message);
                process();
            },
                function (err) {
                    handler.logService(err.message + " on line : " + start);
                    process();
                });
        }
        
        process();
    }

    /**
     * import Handler
     */
    var coreImportHandler = {
        onSuccess: function (jdbSchemaData) {
            handler.logService('Writing DB schemas');
            // start JQL imortation
            if (typeof jdbSchemaData == 'string') {
                return processJQL(jdbSchemaData)
            }

            handler.logService('SchemaData:' + JSON.stringify(jdbSchemaData, null, 3));
            var schemaProcess = new CoreSchemaProcessService(db);
            schemaProcess.process(jdbSchemaData, function () {
                schemaProcess.processCrud(() => {
                    handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
                })
            });
        },

        onError: function (err) {
            handler.logService(err);
            handler.onError(dbErrorPromiseObject("Completed with errors"));
        }
    };

    if (handler.onselect) {
        coreImportHandler.onselect = handler.onselect;
    }

    return AutoSelectFile.start(coreImportHandler);
};