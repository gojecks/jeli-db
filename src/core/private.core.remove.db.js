/**
 * 
 * @param {*} db 
 */
_privateApi.prototype.removeDB = function(db, forceDelete) {
    if (this.openedDB.$hasOwnProperty(db)) {
        var _dbApi = this.$getActiveDB(db),
            _resource = _dbApi.$get('resourceManager'),
            lastSyncedDate = (_resource.getResource() || {}).lastSyncedDate;
        _dbApi
            .$destroy('_db_')
            .$set('open', false);
        // destroy the DB instance
        _resource.removeResource();
        delStorageItem(db);
        /**
         * only store deleted records when db is synced
         */
        if (lastSyncedDate && !forceDelete) {
            updateDeletedRecord('database', { db: db });
        } else {
            _dbApi.$get('recordResolvers').$destroy();
            this.openedDB.$destroy(db);
        }

        _dbApi = _resource = null;

        return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped');
    }

    return dbErrorPromiseObject('Unable to drop Database(' + db + ')');
};