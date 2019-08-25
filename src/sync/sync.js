/**
 * 
 * @param {*} appName 
 */
function jEliDBSynchronization(appName) {
    var activeDB = privateApi.$getActiveDB(appName),
        resolver = activeDB.$get('resolvers'),
        networkResolver = resolver.networkResolver,
        $process = syncHelper.process.startSyncProcess(appName);

    function printLog() {
        networkResolver.logger.forEach(console.log);
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
            if (networkResolver.dirtyCheker) {
                syncHelper.pullResource(appName)
                    .then(function(response) {
                        var resourceChecker = response,
                            $deleteManager = resolver.deleteManager(appName);
                        if (resourceChecker && !resourceChecker.resource && !$deleteManager.isDeletedDataBase()) {
                            /**
                             * Database synced but removed by some other users
                             * killState and return false
                             */
                            if (privateApi.$getActiveDB(appName).$get('resourceManager').getDataBaseLastSyncDate()) {
                                syncHelper.setMessage("Database doesn't exists on the server");
                                syncHelper.killState(appName);
                                return privateApi.removeDB(appName, true);
                            }

                            //first time using jEliDB
                            syncHelper.setMessage('Server Resource was not found');
                            syncHelper.setMessage('Creating new resource on the server');
                            syncHelper.syncResourceToServer(appName)
                                .then(function(resourceResponse) {
                                    var resState = resourceResponse.state;
                                    if (resState) {
                                        //start sync state
                                        syncHelper.setMessage('Resource synchronized successfully');
                                        new startSyncState(appName, false).process();
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

                        syncHelper
                            .process
                            .getProcess(appName)
                            .preparePostSync(resourceChecker.resource, $deleteManager.getRecords());

                        if ($deleteManager.isExists()) {
                            //start deleted Sync State
                            new deleteSyncState(appName, $deleteManager.getRecords(), resourceChecker.resource).process();
                        } else {
                            //start sync state
                            new startSyncState(appName, resourceChecker.resource).process();
                        };

                    }, function(err) {
                        syncHelper.setMessage('Pull Request has failed, please check your network');
                        if (err.data) {
                            syncHelper.setMessage(err.data.message);
                        }
                        syncHelper.killState(appName);
                    });
            }
        } else {
            syncHelper.setMessage('Error processing commit state, either serviceHost was not defined');
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
        $process.getSet('entity', ($isArray(syncTables) ? syncTables : maskedEval(syncTables)));
        //set Message for Entity
        return ({
            configSync: configSync
        });
    };
}