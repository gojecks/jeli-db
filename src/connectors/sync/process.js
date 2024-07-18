/**
 * 
 * @param {*} parent 
 */
class SyncProcess {
    constructor() {
        this.currentProcess = null;
        this._processMapper = new Map();
    }
    /**
     *
     * @param {*} appName
     * @param {*} version
     * @returns
     */
    startSyncProcess(appName, version) {
        this._processMapper.set(appName, new ChildProcess(version, appName));
        this.currentProcess = appName;
        return this._processMapper.get(appName);
    }
    /**
     *
     * @param {*} appName
     */
    destroyProcess(appName) {
        this._processMapper.delete(appName);
    }
    /**
     *
     * @param {*} appName
     * @returns
     */
    getProcess(appName) {
        return this._processMapper.get(appName || this.currentProcess);
    }
    /**
     *
     * @param {*} appName
     * @returns
     */
    getApplicationApiKey(appName) {
        var appProcess = this.getProcess(appName);
        var request = syncHelper.setRequestData(appName, '/application/key', true);
        request.data = { key: "api_key" };
        syncHelper.setMessage('Retrieving API key....');
        return DatabaseSyncConnector.$privateApi.$http(request).then(res => {
            syncHelper.setMessage('Retrieved API key');
            appProcess.getSet('applicationKey', res);
            appProcess = null;
            return res;
        });
    }
}





/**
 * 
 * @param {*} version 
 * @param {*} appName 
 */
class ChildProcess {
    constructor(version, appName) {
        this.version = version;
        this.syncLog = {};
        this.forceSync = false;
        this.appName = appName;
        this.context = new Map();
    }
    getSet(name, value) {
        if (arguments.length > 1) {
            this.context.set(name, value);
        }

        return this.context.get(name);
    }
    /**
     *
     * @param {*} resource
     * @param {*} deletedRecords
     */
    preparePostSync(resource, deletedRecords) {
        var tables = [];
        if (resource && resource.resourceManager && !deletedRecords.database[this.appName]) {
            tables = Object.keys(resource.resourceManager).filter(tbl => (!deletedRecords.rename[tbl] && !deletedRecords.table[tbl]));
        }

        this.context.set('postSyncTables', tables);
    }
    /**
     *
     * @param {*} resource
     */
    prepareSyncState() {
        var tables = this.getSet('entity');
        var tableNameLists = syncHelper.getResourceManagerInstance(this.appName).getTableNames();
        // check if table was requested
        if (tables && tables.length) {
            tables = (('string' == typeof tables) ? [tables] : tables).filter(tbl => tableNameLists.includes(tbl));
        } else {
            tables = tableNameLists || [];
        }

        var postSync = this.getSet('postSync') || [];
        if (postSync) {
            postSync = postSync.filter(tbl => !tables.includes(tbl));
        }

        return ({ tables, postSync });
    }
}



