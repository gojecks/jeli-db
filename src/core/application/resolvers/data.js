/**
 * 
 * @param {*} name 
 */
function CoreDataResolver(name) {
    this.name = name;
    this._records = {};
    if (name) {
        var lStorage = privateApi.storageFacade.get(privateApi.storeMapping.pendingSync, name);
        if (lStorage) {
            for (var key in lStorage) {
                this._records[key] = lStorage[key];
            }
        }
    }
}

CoreDataResolver.prototype.tableRecordHolder = function() {
    return ({
        delete: {},
        update: {},
        insert: {}
    });
};

/**
 * 
 * @param {*} tbl 
 * @param {*} type 
 * @param {*} data 
 */
CoreDataResolver.prototype.setData = function(tbl, type, data) {
    if (!this._records.hasOwnProperty(tbl)) {
        //set the record
        this._records[tbl] = { data: this.tableRecordHolder(), columns: {} };
    }

    var taskHandler = {
        insert: (records) => {
           records.forEach(ref => {
                this._records[tbl].data.insert[ref] = true;
            });
        },
        update: (records) => {
           records.forEach(ref => {
                if (!this._records[tbl].data.insert[ref]) {
                    this._records[tbl].data.update[ref] = true;
                }
            });
        },
        delete: (records) => {
            records.forEach(ref => {
                delete this._records[tbl].data['insert'][ref];
                delete this._records[tbl].data['update'][ref];
                this._records[tbl].data.delete[ref] = true;
            });
        },
        insertReplace: () => {
            taskHandler.insert(data.insert);
            taskHandler.update(data.update);
        }
    };

    if (data.length || isobject(data)){
        taskHandler[type](data);
        privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
    }
}

/**
 * 
 * @param {*} data 
 * @param {*} type 
 */
CoreDataResolver.prototype.setColumns = function(data, type) {
    if (data.length) {
        //push the data to the list
        this._records[tbl].columns[type].push.apply(this._records[tbl].columns[type], data);
        privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
    }
}

/**
 * 
 * @param {*} tbl 
 * @returns 
 */
CoreDataResolver.prototype.get = function(tbl) {
    if (this._records[tbl]) {
        return this.resolveSyncData(tbl);
    }

    return { data: this.tableRecordHolder(), columns: this.tableRecordHolder() };
};

CoreDataResolver.prototype.getAllPending = function() {
    var _this = this;
    return Object.keys(this._records).reduce(function(accum, tblName) {
        accum.push(_this.resolveSyncData(tblName));
        return accum;
    }, []);
};

CoreDataResolver.prototype.isResolved = function(tbl, checksum) {
    var lStorage;
    if (this._records[tbl]) {
        delete this._records[tbl];
        lStorage = privateApi.storageFacade.get(privateApi.storeMapping.pendingSync, this.name);
        if (lStorage) {
            //delete from localStorage
            delete lStorage[tbl];
            privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, lStorage, this.name);
        }
    }

    if (checksum) {
        privateApi.updateDB(this.name, tbl, function(table) {
            table._previousHash = table._hash;
            table._hash = checksum;
        });
    }
};

CoreDataResolver.prototype.destroy = function() {
    if (isemptyobject(this._records)) {
        this._records = {};
        privateApi.storageFacade.remove(privateApi.storeMapping.pendingSync);
    }
};

CoreDataResolver.prototype.rename = function(newName) {
    privateApi.storageFacade.set(privateApi.getDataResolverName(newName), this._records, this.name);
    privateApi.storageFacade.remove(privateApi.storeMapping.pendingSync);
};

/**
 * 
 * @param {*} tbl 
 */
CoreDataResolver.prototype.resolveSyncData = function(tbl) {
    var syncData = {
        data: {}
    };
    var tableData = privateApi.getTableData(this.name, tbl);
    var syncRecords = this._records[tbl];

    /**
     * user specifies the type and ref to resolve
     * type : @types
     * ref : @ref DATA || COLUMN
     */

    for (var type in syncRecords.data) {
        var records = Object.keys(syncRecords.data[type]);
        if (type === "delete") {
            syncData.data[type] = records;
        } else {
            syncData.data[type] = privateApi.getDataByRefs(tableData, records);
        }
    }

    tableData = syncRecords = null;
    return syncData;
};

/**
 * 
 * @param {*} failedRecords 
 */
CoreDataResolver.prototype.handleFailedRecords = function(tbl, failedRecords) {
    var syncRecords = this._records[tbl];
    Object.keys(failedRecords).forEach(handleFailedError);
    function handleFailedError(key) {
        if (failedRecords[key].length) {
            switch(key) {
                case ('insert'):{
                    var tableData = privateApi.getTableData(this.name, tbl); 
                    var records = privateApi.getDataByRefs(tableData, failedRecords[key].map(item => item.ref));
                    var newRefs = [];
                    records.forEach((record, i) => {
                        var item = failedRecords[key][i];
                        if (item.exists[0]){
                            // generate a new GUID
                            record._ref = GUID();
                            // push refs to update
                            newRefs.push([item._ref, record._ref]);
                            syncRecords.data[key][record._ref] = true; 
                        }
                        delete syncRecords.data[key][item.ref];
                    });
                    console.log('new Ref Mapping:', newRefs);
                }
                case ('update'):
                case('delete'): 
                    failedRecords[key].forEach(ref => delete syncRecords.data[key][ref]);
                break;
            }
        }
    }

    // update the storage
    privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
}