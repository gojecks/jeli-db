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
    var _storage = config.storage || 'memory',
        _activeDBInstance = this.$getActiveDB(dbName);
    // check for storage type
    switch (_storage.toLowerCase()) {
        case ('indexeddb'):
            _activeDBInstance.$new('_storage_', new indexedDBStorage(callback, dbName));
            break;
        case ('sqlite'):
        case ('sqlitecipher'):
        case ('websql'):
            if ($inArray(_storage.toLowerCase(), ['sqlite', 'sqlitecipher', 'cordova.sqlite.adapter', 'sqlite.adapter']) && !window.sqlitePlugin) {
                _storage = "websql";
            }

            var sqliteConfig = {
                name: dbName,
                location: config.location || 'default',
                key: config.key || GUID()
            };

            _activeDBInstance.$new('_storage_', new sqliteStorage(_storage, sqliteConfig, callback).mockLocalStorage());
            break;
        case ('localstorage'):
        case ('sessionstorage'):
        case ('memory'):
        default:
            /**
             * custom storage
             */
            if (window[_storage] && $isFunction(window[_storage])) {
                _activeDBInstance.$new('_storage_', new window[_storage](sqliteConfig, callback));
                return;
            }

            //setStorage
            //default storage to localStorage
            _activeDBInstance.$new('_storage_', new jDBStorage(_storage, dbName));
            callback();
            break;
    }
};