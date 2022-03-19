/**
 * Storage Adapter class
 * Used as a static class for registering Database storage Adapters
 * e.g StorageAdapter.add('SQL', ADAPTER_INSTANCE);
 */
function StorageAdapter() {
    this.storageAdapterContainer = new Map();
}

/**
 * 
 * @param {*} name 
 * @param {*} adapter 
 * @param {*} replace 
 */
StorageAdapter.prototype.add = function(name, adapter, replace) {
    var self = this;
    if (name) {
        if ($isArray(name)) {
            name.forEach(store)
        } else {
            store(name);
        }
    }

    function store(storeName) {
        if (!self.storageAdapterContainer.has(storeName) || replace) {
            self.storageAdapterContainer.set(storeName, adapter);
        } else {
            errorBuilder('Adapter already exists, pass true to overwrite');
        }
    }
}

StorageAdapter.prototype.get = function(adapterName) {
    return this.storageAdapterContainer.get(adapterName);
}