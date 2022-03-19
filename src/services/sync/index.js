/**
 * 
 * @param {*} appName 
 * @param {*} version
 */
function DatabaseSynchronization(appName, version) {
    var activeDB = privateApi.getActiveDB(appName);
    var resolver = activeDB.get(constants.RESOLVERS);
    var networkResolver = resolver.networkResolver;
    var $process = syncHelper.process.startSyncProcess(appName, version);

    function printLog() {
        console.group("JDB SYNC");
        networkResolver.logger.forEach(console.log);
        console.groupEnd();
    }

    /**
     * Process Entity State FN
     * @param {*} handler 
     */
    function processEntity(handler) {
        syncHelper.setMessage('ProcessEntity State Started');
        if (handler) {
            networkResolver.handler = handler;
        }

        if (networkResolver.serviceHost) {
            syncHelper.pullResource(appName)
                .then(function(response) {
                    var resourceChecker = response;
                    var $deleteManager = resolver.deleteManager(appName);
                    var checkPassed = (resourceChecker && resourceChecker.resource && !resourceChecker.resource.lastSyncedDate);
                    if (checkPassed && !$deleteManager.isDeletedDataBase()) {
                        /**
                         * Database synced but removed by some other users
                         * killState and return false
                         */
                        if (activeDB.get(constants.RESOURCEMANAGER).getDataBaseLastSyncDate()) {
                            syncHelper.setMessage("Database doesn't exists on the server");
                            syncHelper.killState(appName);
                            return privateApi.removeDB(appName, true);
                        }

                        //first time using Database
                        syncHelper.setMessage('Server Resource was not found');
                        syncHelper.setMessage('Creating new resource on the server');
                        syncHelper.syncResourceToServer(appName)
                            .then(function(resourceResponse) {
                                var resState = resourceResponse.state;
                                if (resState) {
                                    //start sync state
                                    syncHelper.setMessage('Resource synchronized successfully');
                                    startSyncState(appName, false);
                                } else {
                                    //failed to set resource
                                    syncHelper.setMessage('Resource synchronization failed');
                                    syncHelper.killState(appName);
                                }
                            }, function() {
                                syncHelper.setMessage('Resource synchronization failed, please check your log');
                                syncHelper.killState(appName);
                            });

                        return true;
                    }

                    $process.preparePostSync(resourceChecker.resource, $deleteManager.getRecords());
                    if ($deleteManager.isExists()) {
                        //start deleted Sync State
                        deleteSyncState(appName, $deleteManager.getRecords(), resourceChecker.resource);
                    } else {
                        //start sync state
                        startSyncState(appName, resourceChecker.resource);
                    }
                }, function(err) {
                    syncHelper.setMessage('Unable to pull database resource from server, please check your network');
                    if (err.data) {
                        syncHelper.setMessage(err.data.message);
                    }
                    syncHelper.killState(appName);
                });
        } else {
            syncHelper.setMessage('Error processing sync, serviceHost was not defined');
            printLog();
        }
    }

    function configSync(config, forceSync) {
        networkResolver = extend({}, networkResolver, config || {});
        $process.getSet('forceSync', forceSync);
        $process.getSet('networkResolver', networkResolver);
        $process.getSet('onMessage', function(msg) {
            syncHelper.setMessage(msg);
        });

        //check for production state
        if (!networkResolver.inProduction) {
            return ({
                processEntity: processEntity
            });
        } else {
            return new clientService(appName);
        }
    }

    this.Entity = function(syncTables) {
        $process.getSet('entity', syncTables);
        //set Message for Entity
        return ({
            configSync: configSync
        });
    };
}