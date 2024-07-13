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
DatabaseInstance.prototype.helpers = Object.create({
    list:[],
    add: function(help){
        this.list.push(help);
    },
    get: function() {
        return this.list;
    },
    overwrite: function(helps) {
        if (isarray(helps) && helps.length) {
            this.list = helps;
        }
    }
});
DatabaseInstance.prototype.export = DatabaseInstanceExport;
DatabaseInstance.prototype.drop = DatabaseInstanceDrop;
DatabaseInstance.prototype.createTbl = DatabaseInstanceCreateTable;
DatabaseInstance.prototype.api = DatabaseInstanceApi;


/**
 * Application login instance
 * used only when login is required
 */
class DatabaseLoginInstance {
    constructor(name, version){
        this.name = name;
        this.version = version;
        this.api = DatabaseInstanceApi;
    }
    
    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        privateApi.closeDB(this.name, flag);
    };
}



/**
 * Application deleted instance
 * used only when applicated is deleted
 */
class DatabaseDeletedInstance {
    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.jQl = DatabaseInstanceJQL;
        this.info = DatabaseInstanceInfo;
    }
   
    /**
     * 
     * @param {*} flag 
     */
    close(flag) {
        //drop the DB if allowed
        privateApi.closeDB(this.name, flag);
    }
}

