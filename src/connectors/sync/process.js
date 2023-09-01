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
        tables = Object.keys(resource.resourceManager).filter(function(tbl) {
            return (!deletedRecords.rename[tbl] && !deletedRecords.table[tbl]);
        });
    }

    this.context.set('postSyncTables', tables);
};

/**
 * 
 * @param {*} resource 
 */
ChildProcess.prototype.prepareSyncState = function() {
    var tbls = this.getSet('entity');
    var tblNames = syncHelper.getResourceManagerInstance(this.appName).getTableNames();
    // check if table was requested
    if (tbls && tbls.length) {
        tbls = (('string' == typeof tbls) ? [tbls] : tbls).filter(function(tbl) { return Array.isArray(tbl, tblNames); });
    } else {
        tbls = tblNames || [];
    }

    var postSyncTables = this.getSet('postSyncTables');
    if (postSyncTables) {
        postSyncTables.filter(function(tbl) { return !tbls.includes(tbl); });
    }

    return ({ tables: tbls, postSync: postSyncTables || [] });
}