
class DatabaseSyncConnector {
    constructor(config, isExistingDB) {
        this.config = config;
        this.activeDB = DatabaseSyncConnector.coreApi.getActiveDB(config.name);
        this.resolver = this.activeDB.get(DatabaseSyncConnector.coreApi.constants.RESOLVERS);
        this.$process = syncHelper.process.startSyncProcess(config.name, config.version);
    }

    printLog(){
        console.group("JDB SYNC");
        this.resolver.networkResolver.logger.forEach(console.log);
        console.groupEnd();
    }

    /**
     * Process Entity State FN
     * @param {*} handler
     */
    processEntity(handler) {
        syncHelper.setMessage('ProcessEntity State Started');
        if (handler) {
            this.resolver.networkResolver.handler = handler;
        }

        if (this.resolver.networkResolver.serviceHost) {
            syncHelper.pullResource(this.config.name)
                .then((response) => {
                    const resourceChecker = response;
                    const $deleteManager = this.resolver.deleteManager(this.config.name);
                    const checkPassed = (resourceChecker && resourceChecker.resource && !resourceChecker.resource.lastSyncedDate);
                    if (checkPassed && !$deleteManager.isDeletedDataBase()) {
                        /**
                         * Database synced but removed by some other users
                         * killState and return false
                         */
                        if (this.activeDB.get(DatabaseSyncConnector.coreApi.constants.RESOURCEMANAGER).getDataBaseLastSyncDate()) {
                            syncHelper.setMessage("Database doesn't exists on the server");
                            syncHelper.killState(this.config.name);
                            return DatabaseSyncConnector.coreApi.removeDB(this.config.name, true);
                        }

                        //first time using Database
                        syncHelper.setMessage('Server Resource was not found');
                        syncHelper.setMessage('Creating new resource on the server');
                        syncHelper.syncResourceToServer(this.config.name)
                            .then((resourceResponse) => {
                                const resState = resourceResponse.state;
                                if (resState) {
                                    //start sync state
                                    syncHelper.setMessage('Resource synchronized successfully');
                                    startSyncState(this.config.name, false, this.activeDB);
                                } else {
                                    //failed to set resource
                                    syncHelper.setMessage('Resource synchronization failed');
                                    syncHelper.killState(this.config.name);
                                }
                            }, function () {
                                syncHelper.setMessage('Resource synchronization failed, please check your log');
                                syncHelper.killState(this.config.name);
                            });

                        return true;
                    }

                    this.$process.preparePostSync(resourceChecker.resource, $deleteManager.getRecords());
                    if ($deleteManager.isExists()) {
                        //start deleted Sync State
                        DeleteSyncState.mainProcess(this.config.name, $deleteManager.getRecords(), resourceChecker.resource);
                    } else {
                        //start sync state
                        startSyncState(this.config.name, resourceChecker.resource, this.activeDB);
                    }
                }, (err) => {
                    syncHelper.setMessage('Unable to pull database resource from server, please check your network');
                    if (err.data) {
                        syncHelper.setMessage(err.data.message);
                    }
                    syncHelper.killState(this.config.name);
                });
        } else {
            syncHelper.setMessage('Error processing sync, serviceHost was not defined');
            printLog();
        }
    }

    Entity(syncTables) {
        this.$process.getSet('entity', syncTables);
        //set Message for Entity
        return ({
            configSync: (config, forceSync, allowDataSyncing) => {
                Object.assign(this.resolver.networkResolver, config || {});
                this.$process.getSet('allowDataSyncing', allowDataSyncing || false);
                this.$process.getSet('forceSync', forceSync);
                this.$process.getSet('networkResolver', this.resolver.networkResolver);
                this.$process.getSet('onMessage', syncHelper.setMessage);

                //check for production state
                return ({
                    processEntity: handler => this.processEntity(handler)
                });
            }
        });
    }
}