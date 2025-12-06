/**
 * Storage Adapter class
 * Used as a static class for registering Database storage Adapters
 * e.g StorageAdapter.add('SQL', ADAPTER_INSTANCE);
 */
class StorageAdapter {
    static storageAdapterContainer = new Map();
    /**
     * 
     * @param {*} name 
     * @param {*} adapter 
     * @param {*} replace 
     */
    static add(name, adapter, replace) {
        var store = (storeName) => {
            if (!this.storageAdapterContainer.has(storeName) || replace) {
                this.storageAdapterContainer.set(storeName, adapter);
            } else {
                errorBuilder('Adapter already exists, pass true to overwrite');
            }
        };
        
        if (name) {
            if (isarray(name)) {
                name.forEach(store)
            } else {
                store(name);
            }
        }

        return this;
    }

    static get(adapterName) {
        return this.storageAdapterContainer.get(adapterName);
    }
}

