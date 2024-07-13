/**
 * 
 * @param {*} appName 
 * @param {*} version 
 */
function ServerSchemaLoader(appName, version) {
    var activeDB = privateApi.getActiveDB(appName);

    function initializeDBSuccess(isNewMode) {
        return new Promise(function (resolve, reject) {
            privateApi.$http(privateApi.buildHttpRequestOptions(appName, { path: '/database/resource' }))
                .then(function (syncResponse) {
                    if (syncResponse.resource) {
                        /**
                         * Database BE return the exists flag set to false
                         * if the database is not yet created
                         * 
                         */
                        saveAndSyncDownTables(syncResponse.resource, isNewMode);
                    } else {
                        //no resource found on the server
                        handleFailedSync(syncResponse);
                    }
                }, handleNetworkError('resource', "Failed to initialize DB", initializeDBSuccess));


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
             * @param {*} isNewMode
             */
            function loadSchema(tableNames, dbResource, isNewMode) {
                if (!tableNames.length) {
                    return resolve();
                }

                var request = privateApi.buildHttpRequestOptions(appName, { path: '/database/schema', tbl: tableNames || [] });
                privateApi.$http(request)
                    .then(function (mergeResponse) {
                        // Create a new version of the DB
                        var dbTables = {};
                        for (var tbl in mergeResponse.schemas) {
                            // set an empty data 
                            if (mergeResponse.schemas[tbl]) {
                                dbTables[tbl] = extend(mergeResponse.schemas[tbl], dbResource[tbl]);
                                /**
                                 * empty the hash so as to get latest 
                                 */
                                // if (isNewMode) {
                                //     dbTables[tbl]._hash = "";
                                // }
                            }
                        }
                        // register DB to QueryDB
                        privateApi.storageFacade.broadcast(appName, DB_EVENT_NAMES.RESOLVE_SCHEMA, [version, dbTables]);
                        resolve();
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
            function saveAndSyncDownTables(serverResource, isNewMode) {
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
                loadSchema(tableNames, serverResource.resourceManager, isNewMode);
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
        });
    }

    return initializeDBSuccess;
};