/**
 * Synchronization Helper
 */
var syncHelper = (function() {
    'use strict';

    function syncHelperPublicApi() {
        this.process = new SyncProcess(this);
        this.getResourceManagerInstance = function(appName){
            return DatabaseSyncConnector
                .$privateApi
                .getActiveDB(appName)
                .get(DatabaseSyncConnector.$privateApi.constants.RESOURCEMANAGER);
        };
    }

    /**
     * 
     * @param {*} networkResolver 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.printSyncLog = function(appName) {
        var _syncLog = this.process.getProcess(appName).getSet('syncLog');
        var logs = [];
        for (var tbl in _syncLog) {
            logs.push('---Log for ' + tbl + ' table----');
            logs.push('Changes: ' + _syncLog[tbl].localChanges ? 'Local' : 'Server');
            ["delete", "insert", "update"].map(function(list) {
                logs.push(list.toUpperCase() + " : " + _syncLog[tbl][list]);
            });
        }

        this.setMessage(logs);
    };

    /**
     * Sync Message Logger
     * @param {*} log 
     * @param {*} networkResolver 
     */
    syncHelperPublicApi.prototype.setMessage = function(log) {
        var networkResolver = this.process.getProcess(this.process.currentProcess).getSet('networkResolver');
        var localDateStr = new Date().toLocaleString();
        if (log && networkResolver) {
            if (Array.isArray(log)) {
                log = log.map(function(item) { return '[' + localDateStr + '] : ' + item; }).join("\n");
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
    syncHelperPublicApi.prototype.mockTable = function(appName, tbl) {
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
    syncHelperPublicApi.prototype.setTable = function(tbl) {
        return (tbl || this.mockTable());
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} state 
     * @param {*} ignore 
     * @param {*} tbl 
     */
    syncHelperPublicApi.prototype.setRequestData = function(appName, state, ignore, tbl) {
        var request = DatabaseSyncConnector.$privateApi.buildHttpRequestOptions(appName, { tbl: tbl, path: state });
        //ignore post data
        if (!ignore) {
            switch (state.toLowerCase()) {
                case ('/database/sync'):
                    request.data = DatabaseSyncConnector.$privateApi.getTable(appName, tbl, true);
                    request.data.action = "overwrite";
                    break;
                case ('/database/resource/add'):
                    var resource = this.getResourceManagerInstance(appName).getResource();
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
    syncHelperPublicApi.prototype.getSchema = function(appName, requiredTable) {
        var request = this.setRequestData(appName, '/database/schema', false, requiredTable || [])
        return DatabaseSyncConnector.$privateApi.$http(request);
    };

    /**
     * Pull Resource From the Server
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.pullResource = function(appName) {
        return DatabaseSyncConnector.$privateApi.$http(this.setRequestData(appName, '/database/resource', true));
    };

    /**
     * Update the server resource File
     * @param {*} appName 
     * @returns 
     */
    syncHelperPublicApi.prototype.syncResourceToServer = function(appName) {
        this.setMessage('Resource synchronization started');
        return DatabaseSyncConnector.$privateApi.$http(syncHelper.setRequestData(appName, '/database/resource/add', '', ''));
    };


    /**
     * 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.killState = function(appName) {
        this.process.getProcess(appName)
            .getSet('networkResolver')
            .handler.onError({type:'sync',message:"Completed with Errors, please check log"});
        this.process.destroyProcess(appName);
    };

    /**
     * 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.finalizeProcess = function(appName) {
        this.syncResourceToServer(appName)
            .then(() => {
                this.process.getProcess(appName)
                    .getSet('networkResolver')
                    .handler.onSuccess({type:"sync", message:'Synchronization Complete without errors'});
                this.process.destroyProcess(appName);
            });
    };

    /**
     * update the server database with client records
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} data 
     * @param {*} state 
     */
    syncHelperPublicApi.prototype.push = function(appName, tbl, data, state) {
        var _activeDB = DatabaseSyncConnector.$privateApi.getActiveDB(appName);
        this.setMessage('Initializing Push State for table(' + tbl + ')');
        //check state
        state = state || 'push';
        var request = this.setRequestData(appName, state, false, tbl);
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
    syncHelperPublicApi.prototype.pullTable = function(appName, tbl, requestTableData) {
        this.setMessage('---Retrieving ' + tbl + ' schema---');
        var request = this.setRequestData(appName, '/database/pull', false, tbl);
        return DatabaseSyncConnector.$privateApi.$http(request);
    };

    /**
     * 
     * Pull Table from the server
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.pull = function(appName) {
        this.setMessage('Pull  State Started');
        return startSyncState(appName, null, false, true);
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} tables 
     * @param {*} resource 
     * @param {*} version
     */
    syncHelperPublicApi.prototype.syncDownTables = function(appName, tables, resource, version) {
        var $resource = this.getResourceManagerInstance(appName);
        return this
            .getSchema(appName, tables)
            .then(function(pendingTables) {
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

    return new syncHelperPublicApi();
})();