/**
 * Synchronization Helper
 */
class syncHelper{
    static _process = null;
    static get process(){
        if (!syncHelper._process)
            syncHelper._process = new SyncProcess();

        return syncHelper._process;
    }

    static getResourceManagerInstance(appName) {
        return DatabaseSyncConnector
            .$privateApi
            .getActiveDB(appName)
            .get(DatabaseSyncConnector.$privateApi.constants.RESOURCEMANAGER);
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
     * @param {*} state 
     * @param {*} ignore 
     * @param {*} tbl 
     */
    static setRequestData(appName, state, ignore, tbl) {
        var request = DatabaseSyncConnector.$privateApi.buildHttpRequestOptions(appName, { tbl: tbl, path: state });
        //ignore post data
        if (!ignore) {
            switch (state.toLowerCase()) {
                case ('/database/sync'):
                    request.data = DatabaseSyncConnector.$privateApi.getTable(appName, tbl, true);
                    request.data.action = "overwrite";
                    break;
                case ('/database/resource/add'):
                    var resource = syncHelper.getResourceManagerInstance(appName).getResource();
                    if (!resource.lastSyncedDate) {
                        resource.lastSyncedDate = +new Date;
                    }
                    request.data = resource;
                    break;
            }
        }

        return request;
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} requiredData 
     */
    static getSchema(appName, requiredTable) {
        var request = syncHelper.setRequestData(appName, '/database/schema', false, requiredTable || [])
        return DatabaseSyncConnector.$privateApi.$http(request);
    };

    /**
     * Pull Resource From the Server
     * @param {*} appName 
     */
    static pullResource(appName) {
        return DatabaseSyncConnector.$privateApi.$http(syncHelper.setRequestData(appName, '/database/resource', true));
    };

    /**
     * Update the server resource File
     * @param {*} appName 
     * @returns 
     */
    static syncResourceToServer(appName) {
        syncHelper.setMessage('Resource synchronization started');
        return DatabaseSyncConnector.$privateApi.$http(syncHelper.setRequestData(appName, '/database/resource/add', '', ''));
    };


    /**
     * 
     * @param {*} appName 
     */
    static killState(appName) {
        syncHelper.process.getProcess(appName)
            .getSet('networkResolver')
            .handler.onError({ type: 'sync', message: "Completed with Errors, please check log" });
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
                .handler.onSuccess({ type: "sync", message });
            syncHelper.process.destroyProcess(appName);
        };

        syncHelper.syncResourceToServer(appName)
            .then(() => completed('Synchronization Complete without errors'), () => completed('Synchronization Complete with errors'));
    };

    /**
     * update the server database with client records
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} data 
     * @param {*} state 
     */
    static push(appName, tbl, data, state) {
        var _activeDB = DatabaseSyncConnector.$privateApi.getActiveDB(appName);
        syncHelper.setMessage('Initializing Push State for table(' + tbl + ')');
        //check state
        state = state || 'push';
        var request = syncHelper.setRequestData(appName, state, false, tbl);
        //update the table and not overwrite
        if (data) {
            if (!data.columns.diff) {
                data._hash = request.data._hash; //update the postData hash before posting
                request.data = _activeDB.get(DatabaseSyncConnector.$privateApi.constants.RECORDRESOLVERS).get(tbl);
            }
        }

        return DatabaseSyncConnector.$privateApi.$http(request);
    };

    /**
     * get all records from DB
     * @param {*} appName 
     * @param {*} tbl 
     */
    static pullTable(appName, tbl, requestTableData) {
        syncHelper.setMessage('---Retrieving ' + tbl + ' schema---');
        var request = syncHelper.setRequestData(appName, '/database/pull', false, tbl);
        return DatabaseSyncConnector.$privateApi.$http(request);
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
        return syncHelper
            .getSchema(appName, tables)
            .then(function (pendingTables) {
                var _onSchemaTables = {}
                for (var tbl in pendingTables.schemas) {
                    if (resource.resourceManager[tbl]) {
                        $resource.putTableResource(tbl, resource.resourceManager[tbl]);
                        _onSchemaTables[tbl] = pendingTables.schemas[tbl];
                    }
                }
                /**
                 * broadcast event
                 */
                var eventName = DatabaseSyncConnector.$privateApi.DB_EVENT_NAMES.RESOLVE_SCHEMA;
                DatabaseSyncConnector.$privateApi.storageFacade.broadcast(appName, eventName, [version, _onSchemaTables]);
                _onSchemaTables = null;
            });
    };

}