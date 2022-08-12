/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
function ApplicationInstance(name, version) {
    //set the DB name for reference
    this.name = name;
    this.version = version;
    this.storeProc = new StoreProcedure(this);
    this.schema = new PublicSchema(this);
    this.env = new ApplicationEnvInstance(name);
    if (privateApi.getNetworkResolver('serviceHost', name)) {
        //add event listener to db
        // clientService
        this.clientService = new clientService(name);
        // application scheduler
        this.scheduler = new ApplicationScheduler(name);
    }
}

ApplicationInstance.prototype.onUpdate = function(realtimeConfig) {
    var socketEnabled = privateApi.getNetworkResolver('enableSocket', this.name);
    var _realtimeConfig = Object.assign({
        type: 'db',
        dbName: this.name,
        socketEnabled: socketEnabled
    }, realtimeConfig || {});
    return RealtimeAbstract.createInstance(_realtimeConfig);
};

/**
 * 
 * @param {*} flag 
 */
ApplicationInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
};

ApplicationInstance.prototype._users = function() {
    return new ApplicationUsersApi(this);
};
ApplicationInstance.prototype.transaction = ApplicationInstanceTransaction;
ApplicationInstance.prototype.batchTransaction = ApplicationInstanceBatchTransaction;
ApplicationInstance.prototype.table = ApplicationInstanceTable;
ApplicationInstance.prototype.synchronize = ApplicationInstanceSync;
ApplicationInstance.prototype.replicate = ApplicationInstanceReplicate;
ApplicationInstance.prototype.rename = ApplicationInstanceRename;
ApplicationInstance.prototype.jQl = ApplicationInstanceJQL;
ApplicationInstance.prototype.info = ApplicationInstanceInfo;
ApplicationInstance.prototype.import = ApplicationInstanceImport;
ApplicationInstance.prototype.helpers = new jCMDHelpers();
ApplicationInstance.prototype.export = ApplicationInstanceExport;
ApplicationInstance.prototype.drop = ApplicationInstanceDrop;
ApplicationInstance.prototype.createTbl = ApplicationInstanceCreateTable;
ApplicationInstance.prototype.api = ApplicationInstanceApi;


/**
 * Application login instance
 * used only when login is required
 */
function ApplicationLoginInstance(name, version) {
    this.name = name;
    this.version = version;
}

/**
 * 
 * @param {*} flag 
 */
ApplicationLoginInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
};

ApplicationLoginInstance.prototype._users = function() {
    return new ApplicationUsersApi(this);
};

ApplicationLoginInstance.prototype.api = ApplicationInstanceApi;

/**
 * Application deleted instance
 * used only when applicated is deleted
 */
function ApplicationDeletedInstance(name, version) {
    this.name = name;
    this.version = version;
}

/**
 * 
 * @param {*} flag 
 */
ApplicationDeletedInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
};

ApplicationDeletedInstance.prototype.jQl = ApplicationInstanceJQL;
ApplicationDeletedInstance.prototype.synchronize = ApplicationInstanceSync;
ApplicationDeletedInstance.prototype.info = ApplicationInstanceInfo;