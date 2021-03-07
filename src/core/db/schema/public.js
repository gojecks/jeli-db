/**
 * 
 * @param {*} core 
 */
function PublicSchema(core) {
    this.export = function(options) {
        var $promise = new _Promise(),
            resources = core.env.resource(),
            tables = Object.keys(resources.resourceManager),
            fileName = "version_" + options.version;
        if (options.server) {
            syncHelper.getSchema(core.name, tables)
                .then(function(response) {
                    $promise.resolve(structure(response.schemas));
                }, function() {
                    $promise.reject("unable to load schema from server");
                });
        } else {
            var localServer = privateApi.get(core.name, "tables");
            $promise.resolve(structure(localServer));
        }

        /**
         * 
         * @param {*} schemaData 
         */
        function structure(schemaData) {
            var schema = tables.reduce(function(accum, tbl) {
                accum[tbl] = {
                    type: "create",
                    definition: copy(schemaData[tbl].columns)
                };

                if (schemaData[tbl].data && schemaData[tbl].data.length) {
                    accum[tbl].crud = {
                        transactions: [{
                            type: "insert",
                            data: schemaData[tbl].data
                        }]
                    }
                }

                accum[tbl].additionalConfig = [
                    'primaryKey',
                    'foreignKey',
                    'lastInsertId',
                    'allowedMode',
                    'index',
                    '_hash',
                    '_previousHash'
                ].reduce(function(accum_, key) {
                    accum_[key] = schemaData[tbl][key];
                    return accum_;
                }, {});

                return accum;
            }, {});

            var exportGen = new exportGenerator(schema, 'json');
            /**
             * trigger download
             */
            return exportGen.download(fileName);
        }

        return $promise;
    };

    /**
     * add a schema to application
     */
    this.add = function(options) {
        var $promise = new _Promise();
        var schemaProcess = new CoreSchemaProcessService(core);
        schemaProcess.process(options.schemaData, function() {
            $promise.resolve("Schema added successfully");
        });

        return $promise;
    };
}