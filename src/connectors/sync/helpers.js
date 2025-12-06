/**
 * Synchronization Helper
 */
class syncHelper {
    static _process = null;
    static get process() {
        if (!syncHelper._process)
            syncHelper._process = new SyncProcess();

        return syncHelper._process;
    }

    static getResourceManagerInstance(appName) {
        return DatabaseSyncConnector
            .coreApi
            .getActiveDB(appName)
            .get(DatabaseSyncConnector.coreApi.constants.RESOURCEMANAGER);
    };

    /**
     * 
     * @param {*} networkResolver 
     * @param {*} appName 
     */
    static printSyncLog(appName) {
        var _syncLog = syncHelper.process.getProcess(appName).getSet('syncLog');
        var logs = [];
        for (var tbl in _syncLog) {
            logs.push('---Log for ' + tbl + ' table----');
            logs.push('Changes: ' + _syncLog[tbl].localChanges ? 'Local' : 'Server');
            ["delete", "insert", "update"].map(function (list) {
                logs.push(list.toUpperCase() + " : " + _syncLog[tbl][list]);
            });
        }

        syncHelper.setMessage(logs);
    };

    /**
     * Sync Message Logger
     * @param {*} log 
     * @param {*} networkResolver 
     */
    static setMessage(log) {
        var networkResolver = syncHelper.process.getProcess(syncHelper.process.currentProcess).getSet('networkResolver');
        var localDateStr = new Date().toLocaleString();
        if (log && networkResolver) {
            if (Array.isArray(log)) {
                log = log.map(function (item) { return '[' + localDateStr + '] : ' + item; }).join("\n");
            } else {
                log = '[' + localDateStr + '] : ' + log;
            }

            if (networkResolver.logService) {
                networkResolver.logService(log);
            } else {
                networkResolver.logger.push(log);
            }
        }
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} tbl 
     */
    static mockTable(appName, tbl) {
        return ({
            _hash: null,
            data: [],
            columns: [{}],
            DB_NAME: appName,
            TBL_NAME: tbl
        });
    };

    /**
     * bypass undefined table in table set
     * @param {*} tbl 
     */
    static setTable(tbl) {
        return (tbl || syncHelper.mockTable());
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} path 
     * @param {*} tbl 
     */
    static request(appName, path, tbl, data) {
        return DatabaseSyncConnector.coreApi.$http(
            DatabaseSyncConnector.coreApi.buildHttpRequestOptions(appName, { tbl, path, data })
        );
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} requiredData 
     */
    static getSchema(appName, requiredTable) {
        return syncHelper.request(appName, '/database/schema', requiredTable || []);
    };

    /**
     * Pull Resource From the Server
     * @param {*} appName 
     */
    static pullResource(appName) {
        return syncHelper.request(appName, '/database/resource');
    };

    /**
     * Update the server resource File
     * @param {*} appName 
     * @returns 
     */
    static syncResourceToServer(appName) {
        syncHelper.setMessage('Resource synchronization started');
        var resource = syncHelper.getResourceManagerInstance(appName).getResource();
        if (!resource.lastSyncedDate) {
            resource.lastSyncedDate = +new Date;
        }
        return syncHelper.request(appName, '/database/resource/add', null, resource);
    };


    /**
     * 
     * @param {*} appName 
     */
    static killState(appName) {
        syncHelper.process.getProcess(appName)
            .getSet('networkResolver')
            .handler
            .onError({ type: 'sync', message: "Completed with Errors, please check log" });
        syncHelper.process.destroyProcess(appName);
    };

    /**
     * 
     * @param {*} appName 
     */
    static finalizeProcess(appName) {
        var completed = message => {
            syncHelper.process.getProcess(appName)
                .getSet('networkResolver')
                .handler
                .onSuccess({ type: "sync", message });
            syncHelper.process.destroyProcess(appName);
        };

        syncHelper.syncResourceToServer(appName)
            .then(() => completed('Synchronization Complete without errors'), () => completed('Synchronization Complete with errors'));
    };

    /**
     * update the server database with client records
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} allowDataSyncing 
     * @param {*} state 
     */
    static push(appName, tbl, allowDataSyncing) {
        var _activeDB = DatabaseSyncConnector.coreApi.getActiveDB(appName);
        syncHelper.setMessage(`Initializing Push State for table(${tbl})`);
        var collection = DatabaseSyncConnector.coreApi.getTable(appName, tbl, true);
        //update the table and not overwrite
        if (allowDataSyncing) {
            syncHelper.setMessage(`Setting pending records to sync for table(${tbl})`);
            var recordResolver = _activeDB.get(DatabaseSyncConnector.coreApi.constants.RECORDRESOLVERS);
            if (recordResolver.has(tbl)) {
                var records = recordResolver.get(tbl);
                if (Object.keys(records.data).length) {
                    collection.data = records.data;
                }
            }
        }

        return syncHelper.request(appName, '/database/sync', tbl, collection);
    };

    /**
     * get all records from DB
     * @param {*} appName 
     * @param {*} tbl 
     */
    static pullTable(appName, tbl) {
        syncHelper.setMessage(`---Retrieving ${tbl} schema---`);
        return syncHelper.request(appName, '/database/pull', tbl);
    };

    /**
     * 
     * Pull Table from the server
     * @param {*} appName 
     */
    static pull(appName) {
        syncHelper.setMessage('Pull  State Started');
        return startSyncState(appName, null, false, true);
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} tables 
     * @param {*} resource 
     * @param {*} version
     */
    static syncDownTables(appName, tables, resource, version) {
        var $resource = syncHelper.getResourceManagerInstance(appName);
        return this
            .getSchema(appName, tables)
            .then(function (pendingTables) {
                var _onSchemaTables = {};
                for (var tbl in pendingTables.schemas) {
                    if (resource.resourceManager[tbl]) {
                        $resource.putTableResource(tbl, resource.resourceManager[tbl]);
                        _onSchemaTables[tbl] = pendingTables.schemas[tbl];
                    }
                }
                /**
                 * broadcast event
                 */
                var eventName = DatabaseSyncConnector.coreApi.DB_EVENT_NAMES.RESOLVE_SCHEMA;
                DatabaseSyncConnector.coreApi.storageFacade.broadcast(appName, eventName, [version, _onSchemaTables]);
                _onSchemaTables = null;
            });
    }

    /**
     * Checks for conflict between server and client records
     * @param {*} appName
     * @param {*} tbl 
     * @param {*} $process 
     * @param {*} networkResolver 
     * @returns 
     */
    static SyncConflictChecker(appName, tbl, $process, networkResolver) {
        var clientSchema = DatabaseSyncConnector.coreApi.getTable(appName, tbl);
        var serverSchema = $process.getSet('schemas')[tbl];
        // getLatest from server
        if (!this.entity) {
            this.entity = [tbl];
        }

        return new Promise((resolve, reject) => {
            // Perform Merge
            // client table was found
            if (serverSchema) {
                //process server tables
                var snapshot = new SnapShot(serverSchema, clientSchema);
                var log = {};
                log[tbl] = snapshot.getSnap();
                $process.getSet('syncLog', log);
                //@Local Table was found  
                if (!clientSchema) {
                    //ignore deleted tables
                    var checkDeletedTables = networkResolver.deletedRecords.table[tbl];
                    if (checkDeletedTables) {
                        if (checkDeletedTables !== serverSchema._hash) {
                            this.setMessage('Table (' + tbl + ') was dropped on your local DB, but have changes on the server');
                        }
                    } else {
                        this.setMessage('Synchronizing New Table(' + tbl + ') to your local DB');
                    }
                }

                if (snapshot.hashChanges) {
                    this.setMessage('Table(' + tbl + ') was updated on the server');
                    //reject the promise
                    reject({ status: "error", schema: serverSchema, isLocalLastModified: snapshot.isLocalLastModified });
                    return;
                }
                //update
                resolve({ status: "success", changes: snapshot.counter });
            } else {
                //data have changed after last pull
                this.setMessage('Table schema was not found on the SERVER');
                //update
                resolve({ status: "success", changes: 1 });
            }
        });
    }

}