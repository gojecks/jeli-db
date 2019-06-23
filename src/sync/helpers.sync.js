/**
 * Synchronization Helper
 */
function syncHelperPublicApi() {
    var self = this;
    this.process = {
        currentProcess: "",
        $process: {},
        startSyncProcess: function(appName) {
            this.$process[appName] = Object.create({
                syncLog: {},
                forceSync: false,
                getSet: function(name, value) {
                    if (arguments.length > 1) {
                        this[name] = value;
                    }

                    return this[name];
                },
                preparePostSync: function(resource, resourceRecords) {
                    var tables = [];
                    if (resource && resource.resourceManager && !resourceRecords.database[appName]) {
                        tables = Object.keys(resource.resourceManager).filter(function(tbl) {
                            return (!resourceRecords.rename[tbl] && !resourceRecords.table[tbl]);
                        });
                    }

                    this.getSet('postSyncTables', tables);
                },
            });
            this.currentProcess = appName;
            return this.$process[appName];
        },
        destroyProcess: function(appName) {
            this.$process[appName] = null;
        },
        getProcess: function(appName) {
            return this.$process[appName] || null;
        },
        getApplicationApiKey: function(appName) {
            var _appProcess = this.getProcess(appName),
                options = self.setRequestData(appName, '/application/key', true);
            options.data.key = "api_key";
            self.setMessage('Retrieving API key....');
            return privateApi.$http(options).then(function(res) {
                self.setMessage('Retrieved API key');
                _appProcess.getSet('applicationKey', res);
                _appProcess = null;
            });
        }
    };
}

/**
 * 
 * @param {*} networkResolver 
 * @param {*} appName 
 */
syncHelperPublicApi.prototype.printSyncLog = function(networkResolver, appName) {
    var _syncLog = this.process.getProcess(appName).getSet('syncLog'),
        _self = this,
        logs = [];
    for (var i in _syncLog) {
        logs.push('---Log for ' + i + ' table----');
        ["data", "columns"].forEach(function(log) {
            logs.push(log.toUpperCase() + ' Changes: ' + _syncLog[i][log].changesFound);
            ["delete", "insert", "update"].map(function(list) {
                logs.push(list.toUpperCase() + " : " + _syncLog[i][log][list].length);
            });
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
    if (log && networkResolver) {
        if ($isArray(log)) {
            log = log.map(function(item) { return '[' + new Date().toLocaleString() + '] : ' + item; }).join("\n");
        } else {
            log = '[' + new Date().toLocaleString() + '] : ' + log;
        }

        if (networkResolver.logService) {
            networkResolver.logService(log);
        } else {
            networkResolver.logger.push(log);
        }
    }
};

//function fakeTable
/**
 * 
 * @param {*} appName 
 * @param {*} tbl 
 */
syncHelperPublicApi.prototype.createFakeTable = function(appName, tbl) {
    return ({
        _hash: null,
        data: [],
        columns: [{}],
        DB_NAME: appName,
        TBL_NAME: tbl
    });
};

//function to bypass undefined table in table set
/**
 * 
 * @param {*} tbl 
 */
syncHelperPublicApi.prototype.setTable = function(tbl) {
    return (!$isUndefined(tbl) && tbl || this.createFakeTable());
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
                options.data.postData = privateApi.$getTable(appName, tbl, true);
                options.data.action = "overwrite";
                break;
            case ('/database/resource/add'):
                var resource = privateApi.$getActiveDB(appName).$get('resourceManager').getResource();
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

//@Fn Name prepareTables
//@return ARRAY of tables
/**
 * 
 * @param {*} appName 
 * @param {*} resource 
 */
syncHelperPublicApi.prototype.prepareSyncState = function(appName, resource) {
    var tbls = [],
        entities = this.process.getProcess(appName).getSet('entity');
    // check if table was requested
    if ($isArray(entities)) {
        tbls = tbls.concat(entities);
    } else {
        tbls = privateApi.$getActiveDB(appName).$get('resourceManager').getTableNames() || [];
    }

    var postSyncTables = (this.process
            .getProcess(appName)
            .getSet('postSyncTables') || [])
        .filter(function(tbl) { return !$inArray(tbl, tbls) });

    return ({ tables: tbls, postSync: postSyncTables });
};

/**
 * 
 * @param {*} appName 
 * @param {*} requiredData 
 */
syncHelperPublicApi.prototype.getSchema = function(appName, requiredTable) {
    var _options = this.setRequestData(appName, '/database/schema', false, requiredTable || []),
        $defer = new _Promise();

    privateApi.$http(_options)
        .then(function(res) {
            $defer.resolve(res);
        }, function(res) {
            $defer.reject(res);;
        });

    return $defer;
};

//@Function pullResource
//Pull Resource From the Server
/**
 * 
 * @param {*} appName 
 */
syncHelperPublicApi.prototype.pullResource = function(appName) {
    return privateApi.$http(this.setRequestData(appName, '/database/resource', true));
};

//@Function Name syncResourceToServer
//@Objective : Update the server resource File

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

//@FN NAME finalizeProcess();
/**
 * 
 * @param {*} appName 
 */
syncHelperPublicApi.prototype.finalizeProcess = function(appName) {
    this.process.getProcess(appName)
        .getSet('networkResolver')
        .handler.onSuccess(dbSuccessPromiseObject("sync", 'Synchronization Complete without errors'));
    this.process.destroyProcess(appName);
};

//@Function Name Push
//Objective : update the server database with client records
/**
 * 
 * @param {*} appName 
 * @param {*} tbl 
 * @param {*} data 
 * @param {*} state 
 */
syncHelperPublicApi.prototype.push = function(appName, tbl, data, state) {
    var _activeDB = privateApi.$getActiveDB(appName);
    this.setMessage('Initializing Push State for table(' + tbl + ')');
    //check state
    state = state || 'push';
    var _options = this.setRequestData(appName, state, false, tbl);
    //update the table and not overwrite
    if (data) {
        if (!data.columns.diff) {
            data._hash = _options.data.postData._hash; //update the postData hash before posting
            _options.data.postData = _activeDB.$get('recordResolvers').$get(tbl);
            _options.data.action = "update";
        }
    }

    return privateApi.$http(_options);
};

//@Function Name : pullTable
//@objective : get all records from DB
//@return AJAX promise Object
/**
 * 
 * @param {*} appName 
 * @param {*} tbl 
 */
syncHelperPublicApi.prototype.pullTable = function(appName, tbl) {
    this.setMessage('---Retrieving ' + tbl + ' schema---');
    return privateApi.$http(this.setRequestData(appName, '/database/pull', false, tbl));
};

//@Function Name Pull
//@Objective Pull Table from the server
//@Return SyncState Object {}
/**
 * 
 * @param {*} appName 
 */
syncHelperPublicApi.prototype.pull = function(appName) {
    this.setMessage('Pull  State Started');
    return new startSyncState(appName).getDBRecords();
};

/**
 * 
 * @param {*} appName 
 * @param {*} tables 
 * @param {*} resource 
 */
syncHelperPublicApi.prototype.syncDownTables = function(appName, tables, resource) {
    var $resource = privateApi.$getActiveDB(appName).$get('resourceManager');
    return this
        .getSchema(appName, tables)
        .then(function(pendingTables) {
            for (var tbl in pendingTables.schemas) {
                if (resource.resourceManager[tbl]) {
                    $resource.putTableResource(tbl, resource.resourceManager[tbl]);
                    privateApi.$newTable(appName, tbl, pendingTables.schemas[tbl]);
                }

            }
            /**
             * broadcast event
             */
            privateApi.storageEventHandler.broadcast(eventNamingIndex(appName, 'onResolveSchema'), [tables]);
        });
};

/**
 * @method ProcessRequest
 * @param {*} _options 
 * @param {*} resolvedTable 
 * @param {*} appName 
 */
syncHelperPublicApi.prototype.processRequest = function(_options, resolvedTable, appName) {
    var $defer = new _Promise();
    //perform JSON Task
    privateApi.$http(_options)
        .then(function(res) {
            $defer.resolve(res);
            if (resolvedTable) {
                //empty our local recordResolver
                privateApi
                    .$getActiveDB(appName)
                    .$get('recordResolvers')
                    .$isResolved(resolvedTable)
                    .updateTableHash(res._hash);
            }
        }, function(res) {
            $defer.reject(res);
        });

    return $defer;
}

syncHelperPublicApi.prototype.autoSync = function(appName, tbl, data) {
    var _options = this.setRequestData(appName, '/database/push', false, tbl);
    _options.data.postData = data;
    _options.data.action = "update";
    return this.processRequest(_options, tbl, appName);
}

var syncHelper = new syncHelperPublicApi();