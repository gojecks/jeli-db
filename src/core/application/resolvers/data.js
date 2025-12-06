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
     */
    setData(tbl, type, refs) {
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
                    if (!this._records[tbl].data.insert[ref[0]]) {
                        this._records[tbl].data.update[ref[0]] = ref[1];
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
        const actions = {
            insert: () => {
                const tableData = privateApi.getTableData(this.name, tbl); 
                const records = privateApi.getDataByRefs(tableData, failedRecords.insert.map(item => item.ref));
                const newRefs = [];
                records.forEach((record, i) => {
                    if (!syncRecords || !syncRecords.data) return;
                    const item = failedRecords.insert[i];
                    if (item.exists[0]){
                        // generate a new GUID
                        record._ref = GUID();
                        // push refs to update
                        newRefs.push([item._ref, record._ref]);
                        syncRecords.data.insert[record._ref] = true; 
                    }
                    
                    delete syncRecords.data.insert[item._ref];
                });
                console.log('new Ref Mapping:', newRefs);
            },
            update: () => {
                // remove the missing refs from DB since it doesn't exist
                const tableData = privateApi.getTableData(this.name, tbl);
                let toRemove = 0;
                for(var i=0; i < tableData.length; i++){
                    if (failedRecords.update.includes(tableData[i]._ref)){
                        toRemove++;
                        tableData.splice(i, 1);
                        i--;
                    }

                    // break away from loop
                    if (toRemove == failedRecords.update.length){
                        break;
                    }

                }
                privateApi.storageFacade.broadcast(this.name, DB_EVENT_NAMES.TRANSACTION_DELETE, [tbl, failedRecords.update]);
            },
            delete: () => {
                if (syncRecords && syncRecords.data){
                    for(const ref of failedRecords.delete){
                        delete syncRecords.data.delete[ref];
                    }
                }
            }
        };
    
        // update the storage
        Object.keys(failedRecords || {}).forEach(type => {
            if (failedRecords[type].length) {
                actions[type]();
            }
        });
        privateApi.storageFacade.set(privateApi.storeMapping.pendingSync, this._records, this.name);
    }
}