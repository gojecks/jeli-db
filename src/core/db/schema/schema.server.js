/**
 * 
 * @param {*} appName 
 * @param {*} version 
 */
function ServerSchemaLoader(appName, version) {
    var activeDB = privateApi.getActiveDB(appName);
    var promise = new _Promise();

    function initializeDBSuccess() {
        syncHelper
            .pullResource(appName)
            .then(function(syncResponse) {
                if (syncResponse.resource) {
                    /**
                     * JELIDB BE return the exists flag set to false
                     * if the database is not yet created
                     * 
                     */
                    saveAndSyncDownTables(syncResponse.resource)
                } else {
                    //no resource found on the server
                    handleFailedSync(syncResponse);
                }
            }, handleNetworkError('resource', "Failed to initialize DB", initializeDBSuccess));

        return promise;
    }

    function handleFailedSync(response) {
        promise.reject({
            mode: "createMode",
            message: "Unable to initialize DB please contact the Admin",
            netData: response
        });
    }

    /**
     * 
     * @param {*} _loadServerData 
     * @param {*} dbResource 
     * @param {*} onlyLatest 
     */
    function loadSchema(_loadServerData, dbResource) {
        if (!_loadServerData.length) {
            return promise.resolve();
        }

        syncHelper
            .getSchema(appName, _loadServerData)
            .then(function(mergeResponse) {
                // Create a new version of the DB
                var dbTables = {};
                for (var tbl in mergeResponse.schemas) {
                    // set an empty data 
                    if (mergeResponse.schemas[tbl]) {
                        dbTables[tbl] = extend(mergeResponse.schemas[tbl], dbResource[tbl]);
                    }
                }
                // register DB to QueryDB
                privateApi.storageEventHandler.broadcast(eventNamingIndex(appName, 'onResolveSchema'), [version, dbTables]);
                promise.resolve();
            }, handleNetworkError('schema', "Unable to load schema, please try again.", function() {
                // reload the schema when network is stable
                loadSchema(_loadServerData, dbResource);
            }));
    }

    /**
     * 
     * @param {*} resource 
     * @param {*} onlyLatest 
     */
    function saveAndSyncDownTables(resource) {
        var localResource = activeDB.get('resourceManager').getResource();
        var tableNames = activeDB.get('resourceManager')
            .setResource(resource)
            .getTableNames();
        //Get the DB schema 
        //for each Table
        if (localResource) {
            tableNames = activeDB.get('resourceManager').getTableDifferences(localResource);
        }

        loadSchema(tableNames, resource.resourceManager);
    }

    /**
     * 
     * @param {*} state 
     * @param {*} retryFN 
     */
    function handleNetworkError(state, msg, retryFN) {
        var errorInstance = {};
        errorInstance.mode = "AJAXErrorMode";
        errorInstance.message = "[AJAXErrorMode]: " + msg;

        return function(res) {
            if (res && res.message) {
                errorInstance.message += ", " + res.message
            }

            errorInstance.netData = ({
                status: res.status,
                state: state,
                $retry: retryFN
            });

            promise.reject(errorInstance);
        };
    }

    this.get = initializeDBSuccess;
};