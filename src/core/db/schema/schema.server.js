/**
 * 
 * @param {*} appName 
 * @param {*} version 
 */
function SeverSchemaLoader(appName, version) {
    var activeDB = privateApi.$getActiveDB(appName),
        promise = new _Promise(),
        _this = this;

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
                    var tableNames = activeDB.$get('resourceManager')
                        .setResource(syncResponse.resource)
                        .getTableNames();
                    //Get the DB schema 
                    //for each Table
                    loadSchema(tableNames, syncResponse.resource.resourceManager);
                } else {
                    //no resource found on the server
                    handleFailedSync(syncResponse);
                }
            }, handleNetworkError('resource', "Failed to initialize DB", initializeDBSuccess));
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
     */
    function loadSchema(_loadServerData, dbResource) {
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

    initializeDBSuccess();

    return promise;
};