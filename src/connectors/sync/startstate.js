/**
 * 
 * @param {*} appName 
 * @param {*} serverResource 
 * @param {*} activeDB 
 */
function startSyncState(appName, serverResource, activeDB) {
    var $process = syncHelper.process.getProcess(appName);
    var syncState = $process.prepareSyncState(serverResource);
    var networkResolver = $process.getSet('networkResolver');
    var resourceManagerInstance = syncHelper.getResourceManagerInstance(appName);
    var failedState = [];
    var queue = 0;
    var pullRecordList = {};
    var corePromiseResolve = null;
    var corePromiseReject = null;


    /**
     * 
     * @param {*} currentProcessTbl 
     * @returns 
     */
    function _conflictResolver(currentProcessTbl) {
        return new Promise(function (resolve, reject) {
            if (confirm('Update your table(' + currentProcessTbl + ') with Server records (yes/no)')) {
                syncHelper.setMessage('Updating Local(' + currentProcessTbl + ') with Server(' + currentProcessTbl + ')', networkResolver);
                resolve();
            } else {
                reject();
            }
        })
    }

    /**
     * 
     * @param {*} inc 
     * @param {*} state 
     */
    function processQueue(inc, state) {
        var currentProcessTbl = syncState.tables.pop();
        //set message status
        syncHelper.setMessage('Synchronization started for table(' + currentProcessTbl + ')');
        SynchronizeTable(currentProcessTbl, state);
        //increment queue
        queue++;
    }

    function cleanUp() {
        syncState = null;
        $process = null;
        networkResolver = null;
        failedState = null;
        pullRecordList = null;
        corePromiseReject = corePromiseResolve = null;
        resourceManagerInstance = null;
    }

    /**
     * 
     * @param {*} tableToUpdate 
     * @param {*} hash 
     */
    function updateHash(tableToUpdate, hash) {
        if (('string' == typeof tableToUpdate)) {
            tableToUpdate = DatabaseSyncConnector.coreApi.getTable(appName, tableToUpdate);
        }

        //Update Hash
        tableToUpdate._hash = hash;
        tableToUpdate.lastModified = +new Date;
    }

    function isDeletedTable(serverResourceManager, tbl) {
        var localResource = resourceManagerInstance.getResource();
        return (localResource.resourceManager[tbl] && (serverResourceManager && !serverResourceManager[tbl]) &&
            localResource.resourceManager[tbl].lastSyncedDate);
    }

    /**
     * 
     * @param {*} currentProcessTbl 
     * @param {*} state 
     * @returns 
     */
    function SynchronizeTable(currentProcessTbl, state) {
        function failedConflictResolver() {
            if ($process.getSet('forceSync')) {
                syncHelper.setMessage('sync was called with -force:yes');
                allowPushState();
                return;
            }
            syncHelper.setMessage('merging process skipped for ' + currentProcessTbl);
            nextQueue({ state: 'Error' }, 'push');
        }

        /**
         * 
         * @param {*} state 
         * @param {*} errorResponse 
         */
        function syncErrorState(state, errorResponse) {
            failedState.push(currentProcessTbl);
            if (errorResponse.message) {
                syncHelper.setMessage('server error message: ' + errorResponse.message);
            }
            nextQueue({ state: 'Error' }, state);
        }

        function SyncPush() {
            function pushSuccessState(responseData) {
                syncHelper.setMessage(`Push completed for table(${currentProcessTbl})`);
                var checksum = responseData._hash;
                if (responseData.dataSync) {
                    syncHelper.setMessage(`Data sync logs`);
                    syncHelper.setMessage(JSON.stringify(responseData.dataSync, null, 2));

                    // set checksum to hash from data syncing
                    if (responseData.dataSync.ok){
                        activeDB.get(DatabaseSyncConnector.coreApi.constants.RECORDRESOLVERS)
                        .isResolved(currentProcessTbl, responseData.dataSync._hash)
                        .handleFailedRecords(currentProcessTbl, (responseData.dataSync && responseData.dataSync.failed))
                    }
                } else if (responseData._hash){
                    updateHash(currentProcessTbl, responseData._hash);
                }

                DatabaseSyncConnector.coreApi.updateDB(appName, currentProcessTbl, null, +new Date);
                nextQueue({ state: 'Success' }, 'push');
            }

            /**
             * 
             * @param {*} mergeObj 
             */
            function mergeChanges(mergeObj) {
                var tableSchema = DatabaseSyncConnector.coreApi.getTable(appName, currentProcessTbl);
                if (tableSchema) {
                    Object.assign(tableSchema, mergeObj.schema);
                    DatabaseSyncConnector.coreApi.updateDB(appName, currentProcessTbl, null, +new Date);
                    syncHelper.setMessage('Table(' + currentProcessTbl + ') updated successfully');
                    if (mergeObj.isLocalLastModified) {
                        allowPushState();
                    } else {
                        nextQueue({ state: 'Success' }, 'push');
                    }
                }
            }

            /**
             * Allow Push State
             */
            function allowPushState() {
                //api : /database/[state]
                //sync state can only be done by Authorized Application
                syncHelper.push(appName, currentProcessTbl, $process.getSet('allowDataSyncing'))
                    .then(function (pushResponse) {
                        var okay = pushResponse.ok;
                        if (okay) {
                            pushSuccessState(pushResponse);
                        } else {
                            syncErrorState('push');
                        }
                    }, function (pushErrorResponse) {
                        syncErrorState('push', pushErrorResponse);
                    });
            }

            if (!serverResource || (serverResource && (!serverResource.resourceManager || !serverResource.resourceManager[currentProcessTbl]))) {
                /**
                 * check if current processing table has been deleted from server
                 * if true
                 *    confirm with user before dropping the table on the client DB
                 * if confirmed
                 *    drop the table and update the resoure
                 */
                if (isDeletedTable(serverResource.resourceManager, currentProcessTbl)) {
                    syncHelper.setMessage(currentProcessTbl + ' doesn\'t exist on the server');
                    if (networkResolver.resolveDeletedTable(currentProcessTbl)) {
                        var eventName = DatabaseSyncConnector.coreApi.DB_EVENT_NAMES.DROP_TABLE;
                        DatabaseSyncConnector.coreApi.storageFacade.broadcast(appName, eventName, [currentProcessTbl]);
                        resourceManagerInstance.removeTableFromResource(currentProcessTbl);

                        syncHelper.setMessage(currentProcessTbl + ' removed from local DB');
                    }

                    nextQueue({ state: 'error' }, 'push');
                    return;
                } else {
                    /**
                     * synchronize Newly created Table to the server
                     */
                    syncHelper.setMessage('New Table created and needs to sync with Server');
                    allowPushState(false);
                }
            } else {
                syncHelper.SyncConflictChecker(appName, currentProcessTbl, $process, networkResolver)
                    .then(function (response) {
                        // if columns was updated
                        // Push all records to the server
                        if (response.changes) {
                            allowPushState(false);
                        } else {
                            syncHelper.setMessage('Already up to date!');
                            nextQueue({ state: 'Success' }, 'push');
                        }
                    }, function (conflictResponse) {
                        (networkResolver.conflictResolver || _conflictResolver)(currentProcessTbl)
                            .then(function () {
                                mergeChanges(conflictResponse);
                            }, failedConflictResolver);
                    });
            }
        }

        //Pull State
        function SyncPull() {
            syncHelper.pullTable(appName, currentProcessTbl)
                .then(function (tblResult) {
                    //update the recordList
                    pullRecordList[currentProcessTbl] = tblResult._data || syncHelper.mockTable();

                    //goto next queue
                    nextQueue({ state: 'Success' }, 'pull');
                }, function (pullErrorResponse) {
                    syncErrorState('pull');
                });
        }

        return ({ pull: SyncPull, push: SyncPush })[state]();
    }

    /**
     * End process when unable to retireve API key
     */
    function endProcess() {
        syncHelper.setMessage('Unable to retrieve API key');
        syncHelper.killState(appName);
    }

    /**
     * 
     * @param {*} state 
     */
    function finalize(state) {
        const callback = syncHelper[state];
        if (callback) {
            callback(appName);
        }
        //remove deleteRecords
        DatabaseSyncConnector.coreApi.storageFacade.remove(DatabaseSyncConnector.coreApi.storeMapping.delRecordName);
        cleanUp();
    }

    /**
     * 
     * @param {*} response 
     */
    function finalizePush(response) {
        if (syncState.postSync.length && !failedState.length) {
            syncHelper.setMessage('Synching down --' + JSON.stringify(syncState.postSync) + '--');
            syncHelper
                .syncDownTables(appName, syncState.postSync, serverResource, $process.version)
                .then(function () {
                    finalize('finalizeProcess');
                }, function () {
                    syncHelper.setMessage('Error synching down, please try again later');
                    finalize('killState');
                });

            return;
        }
        finalize((response.state.toLowerCase() == 'error') ? 'killState' : 'finalizeProcess');
    }

    /**
     * 
     * @param {*} response 
     */
    function finalizePull(response) {
        if ((response.state.toLowerCase() !== 'error')) {
            corePromiseResolve({
                state: 'Success',
                status: 200,
                data: pullRecordList
            });
        } else {
            corePromiseReject(response);
        }
        cleanUp();
    }

    /**
     * 
     * @param {*} state 
     * @param {*} response 
     */
    function finishQueue(state, response) {
        syncHelper.printSyncLog(appName);
        if (failedState.length) {
            syncHelper.setMessage('synchronization failed for ' + JSON.stringify(failedState));
        }

        return ({ pull: finalizePull, push: finalizePush })[state](response);
    }

    /**
     * 
     * @param {*} response 
     * @param {*} state 
     */
    function nextQueue(response, state) {
        if (syncState.tables.length) {
            processQueue(queue, state);
        } else {
            //Finalized all tables
            finishQueue(state, response);
        }
    }

    /**
     * start sync process
     */
    function startProcess() {
        if (syncState.tables.length) {
            syncHelper.getSchema(appName, syncState.tables)
            .then(tableSchemas => {
                $process.getSet('schemas', tableSchemas.schemas);
                processQueue(queue, 'push');
            }, () => finishQueue('push', {failedState: syncState.tables}))
        } else {
            DatabaseSyncConnector.coreApi.updateDB(appName, null, null, Date.now());
            finishQueue('push', { state: 'success' });
        }
    }

    return new Promise(function (resolve, reject) {
        corePromiseResolve = resolve;
        corePromiseReject = reject;
        startProcess();
    });
}