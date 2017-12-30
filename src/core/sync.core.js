/**
 * 
 * @param {*} appName 
 */
function jEliDBSynchronization(appName) {
    var networkResolver = $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver,
        $process = syncHelper.process.startSyncProcess(appName);

    function setMessage(msg) {
        syncHelper.setMessage(msg, networkResolver);
    }

    //@Function Name syncResourceToServer
    //@Objective : Update the server resource File

    function syncResourceToServer() {
        setMessage('Resource synchronization started');
        var _options = syncHelper.setRequestData(appName, 'resource', '', '');
        _options.type = "PUT";

        return ajax(_options);

    }

    function commit() {
        setMessage('Commit State Started');
    }



    function printLog() {
        for (var log in networkResolver.logger) {
            console.log(networkResolver.logger[log]);
        }
    }

    /**
     * 
     * @param {*} deleteRecords 
     * @param {*} serverResource 
     */

    function deleteSyncState(deleteRecords, serverResource) {

        this.done = function(_task) {
            return function(res) {
                //update the delRecords
                if (res.data.removed.length) {
                    var _delRecordManager = getStorageItem($queryDB.$delRecordName);
                    delete _delRecordManager[appName];
                    //update the storage
                    setStorageItem($queryDB.$delRecordName, _delRecordManager);
                }

                if (_task === 'Table') {
                    new startSyncState(appName, serverResource).process(true);
                } else {
                    syncHelper.finalizeProcess(appName);
                }
            }
        };

        this.fail = function(res) {
            setMessage('Failed to synchronize, unabled to resolve with the server, please try again');
            syncHelper.killState(appName);
        };


        this.process = function() {
            var self = this;
            /**
             * get the Application API
             */
            syncHelper
                .process
                .getApplicationApiKey(appName, networkResolver)
                .then(function() {
                    mainProcess();
                }, function() {
                    setMessage('Failed to retrieve Application Key');
                    self.fail();
                });

            /**
             * Main sync Process
             */

            function mainProcess(apiKey) {
                var api = 'dropTable',
                    data = deleteRecords.table,
                    message = 'Droping ' + JSON.stringify(Object.keys(data)) + ' Tables from the server',
                    _task = "Table";
                //check if database was remove from client
                if (deleteRecords.database[appName]) {
                    api = 'dropDataBase';
                    data = deleteRecords.database;
                    message = "Droping " + appName + " Application from the server";
                    _task = "Application";
                }


                /**
                 * Process renamed Tables before deleting
                 */
                if ($isEqual(_task, 'Table') && Object.keys(deleteRecords.rename).length) {
                    setMessage('Renaming Tables on the server');
                    processRenamedTables()
                        .then(mainRequest, self.fail);
                    return;
                }


                function processRenamedTables() {
                    return request('renameTable', 'PUT', 'renamed', deleteRecords.rename);
                }

                function request(_api, type, ref, data) {
                    var _options = syncHelper.setRequestData(appName, _api, true);
                    _options.data[ref] = data;
                    _options.type = type;
                    return ajax(_options);
                }

                function mainRequest() {
                    //set message to our console
                    setMessage(message);
                    request(api, 'DELETE', 'remove', data)
                        .then(self.done(_task), self.fail);
                }

                mainRequest();
            }
        }
    }

    // @Process Entity State FN
    /**
     * 
     * @param {*} handler 
     */
    function processEntity(handler) {
        setMessage('ProcessEntity State Started');
        if (handler) {
            networkResolver.handler = handler;
        }

        if (networkResolver.serviceHost) {
            if (networkResolver.dirtyCheker) {
                syncHelper.pullResource(appName)
                    .then(function(response) {
                        var resourceChecker = response.data;
                        if (!resourceChecker.resource) {
                            //first time using jEliDB
                            setMessage('Server Resource was not found');
                            setMessage('Creating new resource on the server');
                            syncResourceToServer()
                                .then(function(resourceResponse) {
                                    var resState = resourceResponse.data.state;
                                    if (resState) {
                                        //start sync state
                                        setMessage('Resource synchronized successfully');
                                        new startSyncState(appName, false).process();
                                    } else {
                                        //failed to set resource
                                        setMessage('Resource synchronization failed');
                                        syncHelper.killState(appName);
                                    }
                                }, function() {
                                    setMessage('Resource synchronization failed, please check your log');
                                    syncHelper.killState(appName);
                                });
                        } else {
                            var _delRecordManager = getStorageItem($queryDB.$delRecordName),
                                removedSyncState = null,
                                _pulledResource = resourceChecker.resource;

                            if (_delRecordManager && _delRecordManager[appName]) {
                                //start deleted Sync State
                                new deleteSyncState(_delRecordManager[appName], _pulledResource).process();
                            } else {
                                //start sync state
                                new startSyncState(appName, _pulledResource).process();
                            };

                        }
                    }, function(err) {
                        setMessage('Pull Request has failed, please check your network');
                        if (err.data) {
                            setMessage(err.data.message);
                        }
                        syncHelper.killState(appName);
                    });
            }
        } else {
            setMessage('Error processing commit state, either serviceHost was not defined');
            printLog();
        }
    }

    function configSync(config, forceSync) {
        networkResolver = extend({}, networkResolver, config || {});
        $process.getSet('forceSync', forceSync);
        $process.getSet('networkResolver', networkResolver);

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
        syncHelper.entity = ($isArray(syncTables) ? syncTables : maskedEval(syncTables));
        //set Message for Entity
        return ({
            configSync: configSync
        });
    };

}