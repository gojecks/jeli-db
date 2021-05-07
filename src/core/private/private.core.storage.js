/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
CoreInstance.prototype.setStorage = function(dbName, config, callback) {
    if (this.openedDB.get(dbName).has('_storage_')) {
        callback();
        return;
    }

    /**
     * default storage to memory
     * when invalid storage property
     */
    var storageInit = customStorage.get(config.storage || 'memory'),
        _activeDBInstance = this.getActiveDB(dbName);

    if ($isFunction(storageInit)) {
        var dbToStorageInstance = Object.create({
            getInstance: this.getActiveDB,
            storageEventHandler: this.storageEventHandler,
            eventNamingIndex: eventNamingIndex,
            generateStruct: this.generateStruct,
            storeMapping: this.storeMapping
        });

        _activeDBInstance.new('_storage_', new storageInit({
            type: config.storage,
            name: dbName,
            location: config.location || 'default',
            key: config.key || GUID(),
            folderPath: config.folderPath || '/tmp/',
        }, dbToStorageInstance, callback));
    } else {
        errorBuilder(config.storage + " doesn't exists");
    }
};