/**
 * 
 * @param {*} core 
 */
class PublicSchema {
    constructor(core) {
        this.coreInstance = core;
    }

    export(options) {
        const resources = this.coreInstance.env.resource();
        const tables = Object.keys(resources.resourceManager);
        const fileName = `version_${options.version}`;

        /**
         *
         * @param {*} schemaData
         */
        function structure(schemaData) {
            var schema = tables.reduce(function (accum, tbl) {
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
                    };
                }

                accum[tbl].additionalConfig = [
                    'primaryKey',
                    'foreignKey',
                    'lastInsertId',
                    'allowedMode',
                    'index',
                    '_hash',
                    '_previousHash'
                ].reduce(function (accum_, key) {
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

        return new Promise(function (resolve, reject) {
            if (options.server) {
                var request = privateApi.buildHttpRequestOptions(this.coreInstance.name, { path: '/database/schema', tbl: tables || [] });
                privateApi.$http(request)
                    .then(function (response) {
                        resolve(structure(response.schemas));
                    }, function () {
                        reject("unable to load schema from server");
                    });
            } else {
                var localServer = privateApi.get(this.coreInstance.name, "tables");
                resolve(structure(localServer));
            }
        });
    };

    /**
     * add a schema to application
     */
    add(options) {
        var schemaProcess = new CoreSchemaProcessService(this.coreInstance);
        return new DBPromise(function (resolve, reject) {
            schemaProcess.process(options.schemaData, function () {
                resolve("Schema added successfully");
            });
        });
    }

    getTableModel(tableName, replacerData) {
        var tableSchema = privateApi.getTable(this.coreInstance.name, tableName);
        if (tableSchema) {
            replacerData = (replacerData || {});
            return Object.keys(tableSchema.columns[0]).reduce(function (accum, prop) {
                accum[prop] = (prop in replacerData) ? replacerData[prop] : null;
                return accum;
            }, {});
        }

        return ({});
    }
}