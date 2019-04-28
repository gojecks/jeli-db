/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
_privateApi.prototype.setStorage = function(dbName, config, callback) {
    if (this.openedDB.$get(dbName).$hasOwnProperty('_storage_')) {
        callback();
        return;
    }

    /**
     * default storage to memory
     * when invalid storage property
     */
    var storageInit = customStorage.$get(config.storage || 'memory'),
        _activeDBInstance = this.$getActiveDB(dbName);

    if ($isFunction(storageInit)) {
        storageInit.privateApi = Object.create({
            getResourceName: this.getResourceName,
            $getActiveDB: this.$getActiveDB,
            storageEventHandler: this.storageEventHandler,
            eventNamingIndex: eventNamingIndex,
            getDataResolverName: this.getDataResolverName
        });

        _activeDBInstance.$new('_storage_', new storageInit({
            type: config.storage,
            name: dbName,
            location: config.location || 'default',
            key: config.key || GUID(),
            folderPath: config.folderPath || '/tmp/',
        }, callback));
    } else {
        errorBuilder(config.storage + " doesn't exists");
    }
};