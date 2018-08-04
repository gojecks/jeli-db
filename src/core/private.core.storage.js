/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
_privateApi.prototype.setStorage = function(config, callback) {
    if (this.openedDB.$get(this.$activeDB).$hasOwnProperty('_storage_')) {
        callback();
        return;
    }

    var _storage = config.storage || 'localStorage';
    // check for storage type
    switch (_storage.toLowerCase()) {
        case ('indexeddb'):
            this.$getActiveDB().$new('_storage_', new indexedDBStorage(callback, this.$activeDB));
            break;
        case ('sqlite'):
        case ('sqlitecipher'):
        case ('websql'):
            if ($inArray(_storage.toLowerCase(), ['sqlite', 'sqlitecipher', 'cordova.sqlite.adapter', 'sqlite.adapter']) && !window.sqlitePlugin) {
                _storage = "websql";
            }

            var sqliteConfig = {
                name: this.$activeDB,
                location: config.location || 'default',
                key: config.key || GUID()
            };

            this.$getActiveDB().$new('_storage_', new sqliteStorage(_storage, sqliteConfig, callback).mockLocalStorage());
            break;
        case ('localstorage'):
        case ('sessionstorage'):
        case ('memory'):
        default:
            /**
             * custom storage
             */
            if (window[_storage] && $isFunction(window[_storage])) {
                this.$getActiveDB().$new('_storage_', new window[_storage](sqliteConfig, callback));
                return;
            }

            //setStorage
            //default storage to localStorage
            this.$getActiveDB().$new('_storage_', new jDBStorage(_storage, this.$activeDB));
            callback();
            break;
    }
};