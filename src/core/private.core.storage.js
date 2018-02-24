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
            if ($inArray(_storage.toLowerCase(), ['sqlite', 'sqlitecipher']) && !window.sqlitePlugin) {
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
            //setStorage
            //default storage to localStorage
            this.$getActiveDB().$new('_storage_', $isSupport.localStorage && new jDBStorage(_storage, this.$activeDB));
            callback();
            break;
    }
};