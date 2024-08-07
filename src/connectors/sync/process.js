/**
 * 
 * @param {*} parent 
 */
function SyncProcess(parent) {
    this.parent = parent;
    this.currentProcess = null;
    this._processMapper = new Map();
}

/**
 * 
 * @param {*} appName 
 * @param {*} version 
 * @returns 
 */
SyncProcess.prototype.startSyncProcess = function(appName, version) {
    this._processMapper.set(appName, new ChildProcess(version, appName));
    this.currentProcess = appName;
    return this._processMapper.get(appName);
};

/**
 * 
 * @param {*} appName 
 */
SyncProcess.prototype.destroyProcess = function(appName) {
    this._processMapper.delete(appName);
};

/**
 * 
 * @param {*} appName 
 * @returns 
 */
SyncProcess.prototype.getProcess = function(appName) {
    return this._processMapper.get(appName || this.currentProcess);
};

/**
 * 
 * @param {*} appName 
 * @returns 
 */
SyncProcess.prototype.getApplicationApiKey = function(appName) {
    var appProcess = this.getProcess(appName);
    var request = this.parent.setRequestData(appName, '/application/key', true);
    request.data = {key:"api_key"};
    this.parent.setMessage('Retrieving API key....');
    return DatabaseSyncConnector.$privateApi.$http(request).then(res => {
        this.parent.setMessage('Retrieved API key');
        appProcess.getSet('applicationKey', res);
        appProcess = null;
        return res;
    });
}

/**
 * 
 * @param {*} version 
 * @param {*} appName 
 */
function ChildProcess(version, appName) {
    this.version = version;
    this.syncLog = {};
    this.forceSync = false;
    this.appName = appName;
    this.context = new Map();
}

ChildProcess.prototype.getSet = function(name, value) {
    if (arguments.length > 1) {
        this.context.set(name, value);
    }

    return this.context.get(name);
};

/**
 * 
 * @param {*} resource 
 * @param {*} deletedRecords 
 */
ChildProcess.prototype.preparePostSync = function(resource, deletedRecords) {
    var tables = [];
    if (resource && resource.resourceManager && !deletedRecords.database[this.appName]) {
        tables = Object.keys(resource.resourceManager).filter(tbl => (!deletedRecords.rename[tbl] && !deletedRecords.table[tbl]));
    }

    this.context.set('postSyncTables', tables);
};

/**
 * 
 * @param {*} resource 
 */
ChildProcess.prototype.prepareSyncState = function() {
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