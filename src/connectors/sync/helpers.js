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
        var _syncLog = syncHelper.process.getProcess(appName).getSet('syncLog') || {};
        var logs = [];
        for (var tbl in _syncLog) {
            var snap = _syncLog[tbl];
            logs.push('---Log for ' + tbl + ' table----');
            logs.push('Changes: ' + (snap.localChanges ? 'Local' : 'Server') + (snap.dataChanged ? ' (data changed on server)' : ''));
            ['serverOnly', 'localOnly', 'changed', 'config'].forEach(function (list) {
                logs.push(list.toUpperCase() + " : " + (snap[list] || []).join(', '));
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
        syncHelper.setMessage(`Initializing Push State for table(${tbl})`);
        // schema only: /database/sync seeds `data` as plain rows, pending {insert, update, delete} go through /database/push
        var collection = DatabaseSyncConnector.coreApi.getTable(appName, tbl, true);
        delete collection.data;
        return syncHelper.request(appName, '/database/sync', tbl, collection)
            .then(response => {
                if (!allowDataSyncing || !response || !response.ok) return response;
                syncHelper.setMessage(`Pushing pending records for table(${tbl})`);
                return DatabaseSyncConnector.coreApi.autoSync(appName, tbl, 'insert')
                    .then(dataSync => Object.assign({}, response, (dataSync && dataSync._hash) ? { _hash: dataSync._hash } : {}));
            });
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
    static SyncConflictChecker(appName, tbl, $process) {
        var coreApi = DatabaseSyncConnector.coreApi;
        var clientSchema = coreApi.getTable(appName, tbl);
        var serverSchema = ($process.getSet('schemas') || {})[tbl];

        return new Promise((resolve, reject) => {
            if (!serverSchema) {
                this.setMessage('Table schema was not found on the SERVER');
                return resolve({ status: "success", changes: 1, direction: 'push' });
            }

            if (!clientSchema) {
                this.setMessage('Synchronizing New Table(' + tbl + ') to your local DB');
                return resolve({ status: "success", changes: 1, direction: 'pull', withData: true });
            }

            var snapshot = new SnapShot(serverSchema, clientSchema);
            var log = $process.getSet('syncLog') || {};
            log[tbl] = snapshot.getSnap();
            $process.getSet('syncLog', log);

            if (snapshot.hashChanges) {
                this.setMessage('Table(' + tbl + ') was updated on the server');
                return reject({ status: "error", reason: 'data', schema: serverSchema });
            }

            if (!snapshot.counter) {
                return resolve({ status: "success", changes: 0 });
            }

            // direction comes from which side changed the schema since the last sync, not from lastModified (data writes move it)
            var lastSynced = syncHelper.getResourceManagerInstance(appName).getTableLastSyncDate(tbl) || 0;
            var localChanged = (clientSchema.schemaModified || 0) > lastSynced;
            var serverChanged = !lastSynced || serverSchema.lastModified > lastSynced;
            if (localChanged && serverChanged) {
                this.setMessage('Table(' + tbl + ') schema was changed on the server and locally');
                return reject({ status: "error", reason: 'schema', schema: serverSchema });
            }

            if (!localChanged) {
                this.setMessage('Table(' + tbl + ') schema changed on the server, updating local schema');
                return resolve({ status: "success", changes: snapshot.counter, direction: 'pull' });
            }

            resolve({ status: "success", changes: snapshot.counter, direction: 'push' });
        });
    }

    /**
     * server rows, with local pending inserts/updates kept and pending deletes applied
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} serverRows 
     */
    static mergePendingRecords(appName, tbl, serverRows) {
        var coreApi = DatabaseSyncConnector.coreApi;
        var recordResolver = coreApi.getActiveDB(appName).get(coreApi.constants.RECORDRESOLVERS);
        var pending = recordResolver.has(tbl) ? recordResolver.records[tbl].data : { insert: {}, update: {}, delete: {} };
        var refOf = function (item) { return item._ref || item._id; };
        var keepLocal = Object.keys(pending.insert || {}).concat(Object.keys(pending.update || {}));
        var deleted = Object.keys(pending.delete || {});
        var localRows = coreApi.getTableData(appName, tbl).filter(function (item) { return keepLocal.includes(refOf(item)); });

        return serverRows
            .filter(function (item) { var ref = refOf(item); return !deleted.includes(ref) && !keepLocal.includes(ref); })
            .concat(localRows);
    }

    /**
     * replaces the local schema (and rows when withData) with the server copy
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} version 
     * @param {*} withData 
     */
    static pullTableFromServer(appName, tbl, version, withData) {
        var coreApi = DatabaseSyncConnector.coreApi;
        var request = coreApi.buildHttpRequestOptions(appName, { path: '/database/schema', tbl: [tbl] });
        Object.assign(request, { data: { loadData: withData ? [tbl] : [] } });
        syncHelper.setMessage('Updating local table(' + tbl + ') from the server' + (withData ? ' with records' : ''));
        return coreApi.$http(request).then(function (response) {
            var schema = response && response.schemas && response.schemas[tbl];
            if (!schema) return Promise.reject({ message: 'Table(' + tbl + ') was not found on the server' });
            var rows = withData ? syncHelper.mergePendingRecords(appName, tbl, schema.data || []) : null;
            delete schema.data;

            if (rows && coreApi.tableExists(appName, tbl)) {
                coreApi.truncateTable(appName, tbl);
            }

            var tables = {};
            tables[tbl] = schema;
            coreApi.storageFacade.broadcast(appName, coreApi.DB_EVENT_NAMES.RESOLVE_SCHEMA, [version, tables]);
            return (rows ? coreApi.resolveUpdate(appName, tbl, { insert: rows }) : Promise.resolve())
                .then(function () {
                    coreApi.updateDB(appName, tbl, function (table) {
                        table._hash = schema._hash;
                        table._previousHash = schema._previousHash;
                    }, +new Date);
                    return schema;
                });
        });
    }

}