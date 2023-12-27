/**
 * @param {*} table
 * @param {*} isSchema
 * @param {*} handler
 */

function DatabaseInstanceImport(table, isSchema, handler) {
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
                if (isequal(total, start)) {
                    return handler.onSuccess(dbSuccessPromiseObject('import', "Completed without errors"));
                }

                var query = data[start];
                start++;

                db.jQl(query).then(function(ret) {
                    handler.logService(ret.result.message);
                    process();
                },
                function(err) {
                    handler.logService(err.message + " on line : " + start);
                    process();
                });
            }
        }

        this.onSuccess = function(jdbSchemaData) {
            handler.logService('Writing DB schemas');
            // start JQL imortation
            if (typeof jdbSchemaData == 'string') {
                return processJQL(jdbSchemaData)
            }

            handler.logService('SchemaData:' + JSON.stringify(jdbSchemaData, null, 3));
            var schemaProcess = new CoreSchemaProcessService(db);
            schemaProcess.process(jdbSchemaData, function() {
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

    return new AutoSelectFile(JImport).start(new importHandler());
};