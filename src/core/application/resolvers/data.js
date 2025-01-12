/**
 * 
 * @param {*} name 
 */
class CoreDataResolver {
    constructor(name){
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

    get records(){
        return this._records;
    }

    has(tableName){
        return this._records.hasOwnProperty(tableName);
    }

    tableRecordHolder() {
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
     * @param {*} refs 
     * @param {*} data 
     */
    setData(tbl, type, refs, data) {
        if (!this._records.hasOwnProperty(tbl)) {
            //set the record
            this._records[tbl] = { data: this.tableRecordHolder(), columns: {} };
        }
    
        var taskHandler = {
            insert: () => {
               refs.forEach(ref => {
                    this._records[tbl].data.insert[ref] = true;
                });
            },
            update: () => {
               refs.forEach(ref => {
                    if (!this._records[tbl].data.insert[ref]) {
                        this._records[tbl].data.update[ref] = data;
                    }
                });
            },
            delete: () => {
                refs.forEach(ref => {
                    delete this._records[tbl].data['insert'][ref];
                    delete this._records[tbl].data['update'][ref];
                    this._records[tbl].data.delete[ref] = true;
                });
            }
        };
    
        if (refs.length){
            taskHandler[type]();
            privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
        }
    }
    
    /**
     * 
     * @param {*} data 
     * @param {*} type 
     */
    setColumns(data, type) {
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
    get(tbl) {
        if (this.has(tbl)) {
            return this.resolveSyncData(tbl);
        }
    
        return { data: this.tableRecordHolder(), columns: this.tableRecordHolder() };
    };
    
    getAllPending(ignoreTables) {
        return Object.values(this.getAllPendingWithTables(ignoreTables));
    };

    getAllPendingWithTables(ignoreTables){
        ignoreTables = ignoreTables || [];
        return Object.keys(this._records).reduce((accum, tblName) => {
            if(!inarray(tblName, ignoreTables)){
               var transactions = this.resolveSyncData(tblName);
               if (Object.keys(transactions).length){
                accum[tblName] = transactions;
               }
            }

            return accum;
        }, {});
    }
    /**
     * 
     * @param {*} tbl 
     * @param {*} checksum 
     */
    isResolved(tbl, checksum) {
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

        return this;
    };
    
    destroy() {
        if (isemptyobject(this._records)) {
            this._records = {};
            privateApi.storageFacade.remove(privateApi.storeMapping.pendingSync);
        }
    };
    
    rename(newName) {
        privateApi.storageFacade.set(privateApi.getDataResolverName(newName), this._records, this.name);
        privateApi.storageFacade.remove(privateApi.storeMapping.pendingSync);
    };
    
    /**
     * 
     * @param {*} tbl 
     */
    resolveSyncData(tbl) {
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
            var refs = Object.keys(syncRecords.data[type]);
            if (!refs.length) continue;
            // map data
            switch(type){
                case('delete'):
                    syncData.data[type] = refs;
                break;
                case('update'):
                    syncData.data[type] = refs.map(_ref => ({
                        _ref,
                        _data: syncRecords.data[type][_ref]
                    }));
                break;
                case('insert'):
                    syncData.data[type] = privateApi.getDataByRefs(tableData, refs);
                break;
            }
        }
    
        tableData = syncRecords = null;
        return syncData;
    };
    
    /**
     * 
     * @param {*} failedRecords 
     */
    handleFailedRecords(tbl, failedRecords) {
        var syncRecords = this._records[tbl];
        function handleFailedError(key) {
            if (failedRecords[key].length) {
                switch(key) {
                    case ('insert'):
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
                    break;
                    case ('update'):
                    case('delete'):
                        if (syncRecords && syncRecords.data){
                            failedRecords[key].forEach(ref => delete syncRecords.data[key][ref]);
                        }
                    break;
                }
            }
        }
    
        // update the storage
        Object.keys(failedRecords || {}).forEach(handleFailedError);
        privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
    }
}