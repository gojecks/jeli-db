//prototype for jEli Plugin
var customStorage = new Map(); //used to hold customPlugins
/**
 * core custom pluginFn
 */
function Storage(name, Service, replace) {
    if (name) {
        if ($isArray(name)) {
            name.forEach(store)
        } else {
            store(name);
        }
    }

    function store(storeName) {
        if (!customStorage.has(storeName) || replace) {
            customStorage.set(storeName, Service);
        } else {
            errorBuilder('Plugin already exists, pass true to overwrite');
        }
    }
}

jEliDB.JDB_STORAGE_SYSTEM = Storage;