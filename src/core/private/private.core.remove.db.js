/**
 * core removeDB
 * @param {*} db 
 * @param {*} forceDelete 
 */
_privateApi.prototype.removeDB = function(db, forceDelete) {
    /**
     * check if database exists before proceeding
     */
    if (this.openedDB.$hasOwnProperty(db)) {
        var _dbApi = this.$getActiveDB(db),
            _resource = _dbApi.$get('resourceManager'),
            removeAll = (_resource.getResource() || {}).lastSyncedDate && !forceDelete;
        _dbApi
            .$set('open', false);
        // destroy the DB instance
        // drop all tables
        var tableList = _resource.getTableNames();
        if (tableList) {
            tableList.forEach(function(tableName) {
                privateApi.storageEventHandler.broadcast(eventNamingIndex(db, 'onDropTable'), [tableName]);
            });
        }
        // remove other storage
        var storage = _dbApi.$get('_storage_');
        storage.removeItem(this.storeMapping.pendingSync);
        storage.removeItem('version');
        _resource.removeResource();
        /**
         * only store deleted records when db is synced
         */
        if (removeAll) {
            updateDeletedRecord('database', { db: db });
        } else {
            _dbApi.$get('recordResolvers').$destroy();
            this.openedDB.$destroy(db);
        }


        _dbApi = _resource = null;

        return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped.');
    }

    return dbErrorPromiseObject('Unable to drop Database(' + db + ') or it does not exists.');
};