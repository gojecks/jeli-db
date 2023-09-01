
function DatabaseSyncConnector(config) {
    var activeDB = DatabaseSyncConnector.$privateApi.getActiveDB(config.name);
    var resolver = activeDB.get(DatabaseSyncConnector.$privateApi.constants.RESOLVERS);
    var networkResolver = resolver.networkResolver;
    var $process = syncHelper.process.startSyncProcess(config.name, config.version);

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
            syncHelper.pullResource(config.name)
                .then(function(response) {
                    var resourceChecker = response;
                    var $deleteManager = resolver.deleteManager(config.name);
                    var checkPassed = (resourceChecker && resourceChecker.resource && !resourceChecker.resource.lastSyncedDate);
                    if (checkPassed && !$deleteManager.isDeletedDataBase()) {
                        /**
                         * Database synced but removed by some other users
                         * killState and return false
                         */
                        if (activeDB.get(DatabaseSyncConnector.$privateApi.constants.RESOURCEMANAGER).getDataBaseLastSyncDate()) {
                            syncHelper.setMessage("Database doesn't exists on the server");
                            syncHelper.killState(config.name);
                            return DatabaseSyncConnector.$privateApi.removeDB(config.name, true);
                        }

                        //first time using Database
                        syncHelper.setMessage('Server Resource was not found');
                        syncHelper.setMessage('Creating new resource on the server');
                        syncHelper.syncResourceToServer(config.name)
                            .then(function(resourceResponse) {
                                var resState = resourceResponse.state;
                                if (resState) {
                                    //start sync state
                                    syncHelper.setMessage('Resource synchronized successfully');
                                    startSyncState(config.name, false);
                                } else {
                                    //failed to set resource
                                    syncHelper.setMessage('Resource synchronization failed');
                                    syncHelper.killState(config.name);
                                }
                            }, function() {
                                syncHelper.setMessage('Resource synchronization failed, please check your log');
                                syncHelper.killState(config.name);
                            });

                        return true;
                    }

                    $process.preparePostSync(resourceChecker.resource, $deleteManager.getRecords());
                    if ($deleteManager.isExists()) {
                        //start deleted Sync State
                        deleteSyncState(config.name, $deleteManager.getRecords(), resourceChecker.resource);
                    } else {
                        //start sync state
                        startSyncState(config.name, resourceChecker.resource);
                    }
                }, function(err) {
                    syncHelper.setMessage('Unable to pull database resource from server, please check your network');
                    if (err.data) {
                        syncHelper.setMessage(err.data.message);
                    }
                    syncHelper.killState(config.name);
                });
        } else {
            syncHelper.setMessage('Error processing sync, serviceHost was not defined');
            printLog();
        }
    }

    function configSync(config, forceSync) {
        networkResolver = Object.assign({}, networkResolver, config || {});
        $process.getSet('forceSync', forceSync);
        $process.getSet('networkResolver', networkResolver);
        $process.getSet('onMessage', function(msg) {
            syncHelper.setMessage(msg);
        });

        //check for production state
        return ({
            processEntity
        });
    }

    this.Entity = function(syncTables) {
        $process.getSet('entity', syncTables);
        //set Message for Entity
        return ({
            configSync
        });
    };
}