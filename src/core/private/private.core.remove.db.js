/**
 * remove the required application
 * @param {*} db 
 * @param {*} forceDelete 
 */
_privateApi.prototype.removeDB = function(db, forceDelete) {
    /**
     * check if database exists before proceeding
     */
    if (this.openedDB.has(db)) {
        var databaseInstance = this.getActiveDB(db);
        var _resource = databaseInstance.get('resourceManager');
        var databaseResources = (_resource.getResource() || {});
        var removeAll = (databaseResources.lastSyncedDate && !forceDelete);
        databaseInstance.set('open', false);

        // destroy the DB instance
        // drop all tables
        var tableList = _resource.getTableNames();
        if (tableList) {
            tableList.forEach(function(tableName) {
                privateApi.storageEventHandler.broadcast(eventNamingIndex(db, 'onDropTable'), [tableName]);
            });
        }
        // remove other storage
        var storage = databaseInstance.get('_storage_');
        storage.removeItem(this.storeMapping.pendingSync);
        storage.removeItem('version');
        _resource.removeResource();


        /**
         * only store deleted records when db is synced
         */
        if (removeAll) {
            updateDeletedRecord('database', {
                db: db,
                lastSyncedDate: databaseResources.lastSyncedDate
            });
        } else {
            databaseInstance.get('recordResolvers').destroy();
            this.openedDB.destroy(db);
        }

        databaseInstance = _resource = null;

        return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped.');
    }

    return dbErrorPromiseObject('Unable to drop Database(' + db + ') or it does not exists.');
};