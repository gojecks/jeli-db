/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
function DatabaseInstance(name, version) {
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
    }
}

DatabaseInstance.prototype.onUpdate = function(realtimeConfig) {
    var socketEnabled = privateApi.getNetworkResolver('enableSocket', this.name);
    var _realtimeConfig = Object.assign({
        type: 'db',
        dbName: this.name,
        socketEnabled: socketEnabled
    }, realtimeConfig || {});

    var connector = this.getConnector('realtime-connector', _realtimeConfig);
    return connector;
};



DatabaseInstance.prototype.getConnector = function(name, config){
    var connector = Database.connectors.use(name);
    return new connector(config);
}

/**
 * 
 * @param {*} flag 
 */
DatabaseInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
}

DatabaseInstance.prototype.transaction = DatabaseInstanceTransaction;
DatabaseInstance.prototype.batchTransaction = DatabaseInstanceBatchTransaction;
DatabaseInstance.prototype.table = DatabaseInstanceTable;
DatabaseInstance.prototype.replicate = DatabaseInstanceReplicate;
DatabaseInstance.prototype.rename = DatabaseInstanceRename;
DatabaseInstance.prototype.jQl = DatabaseInstanceJQL;
DatabaseInstance.prototype.info = DatabaseInstanceInfo;
DatabaseInstance.prototype.import = DatabaseInstanceImport;
DatabaseInstance.prototype.helpers = new jCMDHelpers();
DatabaseInstance.prototype.export = DatabaseInstanceExport;
DatabaseInstance.prototype.drop = DatabaseInstanceDrop;
DatabaseInstance.prototype.createTbl = DatabaseInstanceCreateTable;
DatabaseInstance.prototype.api = DatabaseInstanceApi;


/**
 * Application login instance
 * used only when login is required
 */
function DatabaseLoginInstance(name, version) {
    this.name = name;
    this.version = version;
}

/**
 * 
 * @param {*} flag 
 */
DatabaseLoginInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
};

DatabaseLoginInstance.prototype.api = DatabaseInstanceApi;

/**
 * Application deleted instance
 * used only when applicated is deleted
 */
function DatabaseDeletedInstance(name, version) {
    this.name = name;
    this.version = version;
}

/**
 * 
 * @param {*} flag 
 */
DatabaseDeletedInstance.prototype.close = function(flag) {
    //drop the DB if allowed
    privateApi.closeDB(this.name, flag);
};

DatabaseDeletedInstance.prototype.jQl = DatabaseInstanceJQL;
DatabaseDeletedInstance.prototype.info = DatabaseInstanceInfo;