//prototype for jEli Plugin
var customStorage = new watchBinding(); //used to hold customPlugins
/**
 * core custom pluginFn
 */
function Storage(name, Service) {
    if (name && !customStorage.hasProp(name)) {
        customStorage.$new(name, Service);
    } else {
        errorBuilder('Failed to register plugin, either it already exists or invalid definition');
    }
}

global.JDB_STORAGE_SYSTEM = Storage;
exports.JDB_STORAGE_SYSTEM = Storage;