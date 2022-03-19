/**
 * Synchronization Helper
 */
var syncHelper = (function() {
    'use strict';

    function syncHelperPublicApi() {
        this.process = new SyncProcess(this);
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
            if ($isArray(log)) {
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
        return (!$isUndefined(tbl) && tbl || this.mockTable());
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} state 
     * @param {*} ignore 
     * @param {*} tbl 
     */
    syncHelperPublicApi.prototype.setRequestData = function(appName, state, ignore, tbl) {
        var options = privateApi.buildOptions(appName, tbl, state),
            process = this.process.getProcess(appName);
        //ignore post data
        if (!ignore) {
            switch (state.toLowerCase()) {
                case ('/database/push'):
                case ('/database/sync'):
                    options.data.postData = privateApi.getTable(appName, tbl, true);
                    options.data.action = "overwrite";
                    break;
                case ('/database/resource/add'):
                    var resource = privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
                    if (!resource.lastSyncedDate) {
                        resource.lastSyncedDate = +new Date;
                    }
                    options.data.postData = resource;
                    break;
            }
        }
        /**
         * add the api_key to the Authorization Header
         */
        if (process && process.hasOwnProperty('applicationKey')) {
            options.headers['X-API-KEY'] = process.getSet('applicationKey').api_key;
        }

        return options;
    };

    /**
     * 
     * @param {*} appName 
     * @param {*} requiredData 
     */
    syncHelperPublicApi.prototype.getSchema = function(appName, requiredTable) {
        var _options = this.setRequestData(appName, '/database/schema', false, requiredTable || [])
        return privateApi.$http(_options);
    };

    /**
     * Pull Resource From the Server
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.pullResource = function(appName) {
        return privateApi.$http(this.setRequestData(appName, '/database/resource', true));
    };

    /**
     * Update the server resource File
     * @param {*} appName 
     * @returns 
     */
    syncHelperPublicApi.prototype.syncResourceToServer = function(appName) {
        this.setMessage('Resource synchronization started');
        return privateApi.$http(syncHelper.setRequestData(appName, '/database/resource/add', '', ''));
    };


    /**
     * 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.killState = function(appName) {
        this.process.getProcess(appName)
            .getSet('networkResolver')
            .handler.onError(dbErrorPromiseObject("Completed with Errors, please check log"));
        this.process.destroyProcess(appName);
    };

    /**
     * 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.finalizeProcess = function(appName) {
        var _this = this;
        this.syncResourceToServer(appName)
            .then(function() {
                _this.process.getProcess(appName)
                    .getSet('networkResolver')
                    .handler.onSuccess(dbSuccessPromiseObject("sync", 'Synchronization Complete without errors'));
                _this.process.destroyProcess(appName);
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
        var _activeDB = privateApi.getActiveDB(appName);
        this.setMessage('Initializing Push State for table(' + tbl + ')');
        //check state
        state = state || 'push';
        var _options = this.setRequestData(appName, state, false, tbl);
        //update the table and not overwrite
        if (data) {
            if (!data.columns.diff) {
                data._hash = _options.data.postData._hash; //update the postData hash before posting
                _options.data.postData = _activeDB.get(constants.RECORDRESOLVERS).get(tbl);
                _options.data.action = "update";
            }
        }

        return privateApi.$http(_options);
    };

    /**
     * get all records from DB
     * @param {*} appName 
     * @param {*} tbl 
     */
    syncHelperPublicApi.prototype.pullTable = function(appName, tbl, requestTableData) {
        this.setMessage('---Retrieving ' + tbl + ' schema---');
        var options = this.setRequestData(appName, '/database/pull', false, tbl);
        return privateApi.$http(options);
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
        var $resource = privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER);
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
                privateApi.storageEventHandler.broadcast(eventNamingIndex(appName, 'onResolveSchema'), [version, _onSchemaTables]);
                _onSchemaTables = null;
            });
    };

    /**
     * @method ProcessRequest
     * @param {*} _options 
     * @param {*} resolvedTable 
     * @param {*} appName 
     */
    syncHelperPublicApi.prototype.processRequest = function(_options, resolvedTable, appName) {
        //perform JSON Task
        return privateApi.$http(_options)
            .then(function(res) {
                if (resolvedTable) {
                    //empty our local recordResolver
                    privateApi
                        .getActiveDB(appName)
                        .get(constants.RECORDRESOLVERS)
                        .isResolved(resolvedTable, res._hash);
                }

                return res;
            });
    }

    syncHelperPublicApi.prototype.autoSync = function(appName, tbl, data) {
        var _options = this.setRequestData(appName, '/database/push', false, tbl);
        _options.data.postData = data;
        _options.data.action = "update";
        return this.processRequest(_options, tbl, appName);
    };

    return new syncHelperPublicApi();
})();