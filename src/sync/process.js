/**
 * 
 * @param {*} parent 
 */
function SyncProcess(parent) {
    this.currentProcess = null;
    this.$process = new Map();
    this.startSyncProcess = function(appName, version) {
        this.$process.set(appName, new ChildProcess(version, appName));
        this.currentProcess = appName;
        return this.$process.get(appName);
    };

    this.destroyProcess = function(appName) {
        this.$process.delete(appName);
    };
    this.getProcess = function(appName) {
        return this.$process.get(appName || this.process.currentProcess);
    };

    this.getApplicationApiKey = function(appName) {
        var _appProcess = this.getProcess(appName),
            options = parent.setRequestData(appName, '/application/key', true);
        options.data.key = "api_key";
        parent.setMessage('Retrieving API key....');
        return privateApi.$http(options).then(function(res) {
            parent.setMessage('Retrieved API key');
            _appProcess.getSet('applicationKey', res);
            _appProcess = null;
        });
    }
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
    this.getSet = function(name, value) {
        if (arguments.length > 1) {
            this[name] = value;
        }

        return this[name];
    };
    this.preparePostSync = function(resource, resourceRecords) {
        var tables = [];
        if (resource && resource.resourceManager && !resourceRecords.database[appName]) {
            tables = Object.keys(resource.resourceManager).filter(function(tbl) {
                return (!resourceRecords.rename[tbl] && !resourceRecords.table[tbl]);
            });
        }

        this.getSet('postSyncTables', tables);
    }
}