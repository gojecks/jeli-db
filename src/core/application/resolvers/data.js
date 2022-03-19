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

    if (data.length) {
        //push the data to the list
        for (var ref of data) {
            switch (type) {
                case ('update'):
                    delete this._records[tbl].data['insert'][ref];
                    break;
                case ('delete'):
                    delete this._records[tbl].data['insert'][ref];
                    delete this._records[tbl].data['update'][ref];
                    break;
            }

            this._records[tbl].data[type][ref] = true;
        }

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
    if ($isEmptyObject(this._records)) {
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
        data: {
            delete: {},
            update: [],
            insert: []
        }
    };
    var tableData = privateApi.getTableData(this.name, tbl);
    var syncRecords = this._records[tbl];

    /**
     * user specifies the type and ref to resolve
     * type : @types
     * ref : @ref DATA || COLUMN
     */

    for (var type in syncData.data) {
        var records = Object.keys(syncRecords.data[type]);
        if (type === "delete") {
            syncData.data[type] = records.reduce(function(accum, ref) {
                accum[ref] = true;
                return accum;
            }, {});
        } else {
            syncData.data[type] = privateApi.getDataByRefs(tableData, records);
        }
    }

    tableData = syncRecords = null;
    return syncData;
};