/**
 * 
 * @param {*} dbName 
 * @param {*} version 
 * @param {*} config 
 * @param {*} lastLoadedTime 
 * @returns Promise
 */
function ServerSchemaLoader(dbName, version, config, lastLoadedTime) {
    var activeDB = privateApi.getActiveDB(dbName);
    config = Object.assign({ loadData: [], maximumRetries: 5, ttl: '1w' }, ('object' == typeof config) ? config : {});

    return new Promise((resolve, reject) => {
        var retryCount = 1;
        var timer = 1000;
        // generate time from now based on format
        var nextSyncDate = getDateTimeFromTTL((config.ttl || '1w'));

        function schemaLoadRetries(err) {
            if (!config.maximumRetries || (config.maximumRetries == retryCount)) {
                console.log('[SchemaLoader] failed to load resource, aborting');
                return handleNetworkError('resource', 'Failed to initialize DB')(err);
            }

            console.log('[SchemaLoader] Scheduled retries');
            ++retryCount;
            setTimeout(loadResource, (timer * retryCount));
        }

        function loadResource() {
            privateApi.$http(privateApi.buildHttpRequestOptions(dbName, { path: '/database/resource' }))
                .then(syncResponse => {
                    if (syncResponse.resource) {
                        /**
                         * Database BE return the exists flag set to false
                         * if the database is not yet created
                         */
                        saveAndSyncDownTables(syncResponse.resource);
                    } else {
                        //no resource found on the server
                        handleFailedSync(syncResponse);
                    }
                }, schemaLoadRetries);
        }


        /**
         * 
         * @param {*} response 
         * @param {*} reject 
         */
        function handleFailedSync(response) {
            reject({
                mode: "createMode",
                message: "Unable to initialize DB please contact the Admin",
                netData: response
            });
        }

        /**
         * 
         * @param {*} _loadServerData 
         * @param {*} dbResource 
         */
        function loadSchema(tableNames, dbResource) {
            if (!tableNames || !tableNames.length) {
                return resolve(nextSyncDate);
            }

            var request = privateApi.buildHttpRequestOptions(dbName, { path: '/database/schema', tbl: tableNames || [] });
            Object.assign(request, { data: { loadData: config.loadData } });
            privateApi.$http(request)
                .then(function (mergeResponse) {
                    // Create a new version of the DB
                    var dbTables = {};
                    for (var tbl in mergeResponse.schemas) {
                        // set an empty data 
                        if (mergeResponse.schemas[tbl]) {
                            // extend table
                            dbTables[tbl] = Object.assign(mergeResponse.schemas[tbl], dbResource[tbl]);
                        }
                    }
                    // register DB to QueryDB
                    privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.RESOLVE_SCHEMA, [version, dbTables]);
                    resolve(nextSyncDate);
                }, handleNetworkError('schema', "Unable to load schema, please try again.", function () {
                    // reload the schema when network is stable
                    loadSchema(tableNames, dbResource);
                }));
        }

        /**
         * 
         * @param {*} resource 
         * @param {*} onlyLatest 
         */
        function saveAndSyncDownTables(serverResource) {
            var resource = activeDB.get(constants.RESOURCEMANAGER);
            var localResource = resource.getResource();
            if (localResource) {
                if (!serverResource.resourceManager || Array.isArray(serverResource.resourceManager)) {
                    serverResource.resourceManager = localResource.resourceManager;
                } else {
                    for (var tbl in localResource.resourceManager) {
                        if (!serverResource.resourceManager.hasOwnProperty(tbl)) {
                            serverResource.resourceManager[tbl] = localResource.resourceManager[tbl];
                        }
                    }
                }
            }

            resource.setResource(serverResource);
            //Get the DB schema 
            //for each Table
            var tableNames = resource.getTableDifferences(localResource);
            loadSchema(tableNames, serverResource.resourceManager);
        }

        /**
         * 
         * @param {*} state 
         * @param {*} msg 
         * @param {*} retryFN 
         * @returns 
         */
        function handleNetworkError(state, msg, retryFN) {
            var errorInstance = {};
            errorInstance.mode = "AJAXErrorMode";
            errorInstance.message = "[AJAXErrorMode]: " + msg;

            return function (res) {
                if (res && res.message) {
                    errorInstance.message += ", " + res.message
                }

                errorInstance.netData = ({
                    status: res.status,
                    state: state,
                    $retry: retryFN
                });

                reject(errorInstance);
            };
        }

        // loadResource
        loadResource();
    });
};