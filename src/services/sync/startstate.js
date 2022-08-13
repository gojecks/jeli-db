/**
 * 
 * @param {*} appName 
 * @param {*} serverResource 
 * @param {*} loadedApiKey 
 * @param {*} pullState 
 */
function startSyncState(appName, serverResource, loadedApiKey, pullState) {
    var $process = syncHelper.process.getProcess(appName);
    var syncState = $process.prepareSyncState(serverResource);
    var networkResolver = $process.getSet('networkResolver');
    var failedState = [];
    var queue = 0;
    var pullRecordList = {};
    var _resolve = null;
    var _reject = null;


    /**
     * 
     * @param {*} currentProcessTbl 
     * @returns 
     */
    function _conflictResolver(currentProcessTbl) {
        return new Promise(function(resolve, reject) {
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
    }

    /**
     * 
     * @param {*} tableToUpdate 
     * @param {*} hash 
     */
    function updateHash(tableToUpdate, hash) {
        if (isstring(tableToUpdate)) {
            tableToUpdate = privateApi.getTable(appName, tableToUpdate);
        }

        //Update Hash
        tableToUpdate._hash = hash;
        tableToUpdate.lastModified = +new Date;
    }

    function isDeletedTable(serverResourceManager, tbl) {
        var localResource = privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
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
                allowPushState(false);
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
            function pushSuccessState(checksum) {
                syncHelper.setMessage('Push completed for table(' + currentProcessTbl + ')');
                if (checksum) {
                    updateHash(currentProcessTbl, checksum);
                }

                privateApi.updateDB(appName, currentProcessTbl, null, +new Date);
                nextQueue({ state: 'Success' }, 'push');
            }

            /**
             * 
             * @param {*} mergeObj 
             */
            function mergeChanges(mergeObj) {
                var tableSchema = privateApi.getTable(appName, currentProcessTbl);
                if (tableSchema) {
                    Object.assign(tableSchema, mergeObj.schema);
                    privateApi.updateDB(appName, currentProcessTbl, null, +new Date);
                    syncHelper.setMessage('Table(' + currentProcessTbl + ') updated successfully');
                    if (mergeObj.isLocalLastModified) {
                        allowPushState(false);
                    } else {
                        nextQueue({ state: 'Success' }, 'push');
                    }
                }
            }

            /**
             * Allow Push State
             * @param {*} data 
             */
            function allowPushState(data) {
                //api : /database/[state]
                //sync state can only be done by Authorized Application
                syncHelper.push(appName, currentProcessTbl, data, '/database/sync')
                    .then(function(pushResponse) {
                        var okay = pushResponse.ok;
                        if (okay) {
                            pushSuccessState(pushResponse._hash);
                        } else {
                            syncErrorState('push');
                        }
                    }, function(pushErrorResponse) {
                        syncErrorState('push', pushErrorResponse);
                    });
            }

            if (!serverResource || (serverResource && !serverResource.resourceManager[currentProcessTbl])) {
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
                        privateApi.storageFacade.broadcast(appName, DB_EVENT_NAMES.DROP_TABLE, [currentProcessTbl]);

                        privateApi
                            .getActiveDB(appName)
                            .get(constants.RESOURCEMANAGER)
                            .removeTableFromResource(currentProcessTbl);

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
                SyncConflictChecker(appName, currentProcessTbl)
                    .then(function(response) {
                        //if columns was updated
                        //Push all records to the server
                        if (response.changes) {
                            allowPushState(false);
                        } else {
                            syncHelper.setMessage('Already up to date!');
                            nextQueue({ state: 'Success' }, 'push');
                        }
                    }, function(conflictResponse) {
                        (networkResolver.conflictResolver || _conflictResolver)(currentProcessTbl)
                        .then(function() {
                            mergeChanges(conflictResponse);
                        }, failedConflictResolver);
                    });
            }
        };

        //Pull State
        function SyncPull() {
            syncHelper.pullTable(appName, currentProcessTbl)
                .then(function(tblResult) {
                    //update the recordList
                    pullRecordList[currentProcessTbl] = tblResult._data || syncHelper.mockTable();

                    //goto next queue
                    nextQueue({ state: 'Success' }, 'pull');
                }, function(pullErrorResponse) {
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
        if (state && isfunction(syncHelper[state])) {
            syncHelper[state](appName);
        }
        //remove deleteRecords
        privateApi.storageFacade.remove(privateApi.storeMapping.delRecordName);
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
                .then(function() {
                    finalize('finalizeProcess');
                }, function() {
                    syncHelper.setMessage('Error synching down, please try again later');
                    finalize('killState');
                });

            return;
        }
        finalize(isequal(response.state.toLowerCase(), 'error') ? 'killState' : 'finalizeProcess');
    }

    /**
     * 
     * @param {*} response 
     */
    function finalizePull(response) {
        if (isequal(response.state.toLowerCase(), 'error')) {
            _resolve({
                state: 'Success',
                status: 200,
                data: pullRecordList
            });
        } {
            _reject(response);
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
            processQueue(queue, 'push');
        } else {
            privateApi.updateDB(appName, null, null, +new Date);
            finishQueue('push', { state: 'success' });
        }
    }

    return new DBPromise(function(resolve, reject) {
        _resolve = resolve;
        _reject = reject;

        /**
         * pull data from server
         */
        if (pullState) {
            processQueue(queue, 'pull');
            return;
        }

        if (!loadedApiKey) {
            syncHelper
                .process
                .getApplicationApiKey(appName)
                .then(startProcess, endProcess);
        } else {
            startProcess();
        }
    });
}