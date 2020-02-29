function _privateTaskPerfomer() {
    var _publicApi = Object.create({
        updateDeletedRecord: updateDeletedRecord,
        set: setStorageItem,
        get: getStorageItem,
        del: delStorageItem
    });
    /**
     * 
     * @param {*} name 
     * @param {*} tblName 
     * @param {*} updateFn 
     * @param {*} lastSynced 
     */
    _publicApi.updateDB = function(name, tblName, updateFn, lastSynced) {
        var openedDb = privateApi.$getActiveDB(name);
        //put the data to DB
        if (openedDb) {
            //update the table lastModified
            var table = privateApi.$getTable(name, tblName);
            if (table) {
                var ret = {};
                ret.lastModified = +new Date;
                ret._hash = table._hash;
                ret._previousHash = table._previousHash;

                if (updateFn && $isFunction(updateFn)) {
                    updateFn.apply(updateFn, [ret]);
                }

                privateApi.storageEventHandler.broadcast(eventNamingIndex(name, 'onUpdateTable'), [tblName, ret]);
            }

            /**
             * update Database resource
             */
            var resourceManager = openedDb.$get('resourceManager'),
                dbRef = resourceManager.getResource();
            if (dbRef) {
                if (table) {
                    // new synced table
                    if (!dbRef.resourceManager[tblName]) {
                        resourceManager.addTableToResource(tblName, {
                            lastModified: table.lastModified,
                            _hash: table._hash,
                            created: table.created || +new Date
                        });
                    }
                }
                /**
                 * set last sync date for table
                 */
                if (dbRef.resourceManager.hasOwnProperty(tblName)) {
                    dbRef.resourceManager[tblName].lastSyncedDate = lastSynced || dbRef.resourceManager[tblName].lastSyncedDate || null;
                }
                dbRef.lastUpdated = +new Date;
                dbRef.lastSyncedDate = lastSynced || dbRef.lastSyncedDate;
                //update
                resourceManager.setResource(dbRef);
            }
        }
    };

    return _publicApi;
};