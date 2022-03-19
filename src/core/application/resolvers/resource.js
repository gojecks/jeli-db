/**
 * ResourceManager()
 * @param {*} name 
 */
function ResourceManager(name) {
    var _resource = privateApi.storageFacade.get(privateApi.storeMapping.resourceName, name);

    this.getResource = function() {
        return _resource || privateApi.storageFacade.get(privateApi.storeMapping.resourceName, name);
    };

    /**
     * 
     * @param {*} resource 
     */
    this.setResource = function(resource, _name) {
        _resource = resource || _resource;
        //set and save the resource
        privateApi.storageFacade.set(_name || privateApi.storeMapping.resourceName, _resource, name);
        return this;
    };

    this.$isExists = function() {
        return !!_resource;
    };

    this.renameResource = function(newName) {
        var resource = this.getResource();
        resource.lastUpdated = +new Date;
        this.setResource(resource, privateApi.getResourceName(newName))
            .removeResource();
    };

    this.removeResource = function() {
        _resource = null;
        return privateApi.storageFacade.remove(privateApi.storeMapping.resourceName, name);
    };

    this.getTableLastSyncDate = function(tbl) {
        return _resource && _resource.resourceManager.hasOwnProperty(tbl) && _resource.resourceManager[tbl].lastSyncedDate;
    };

    this.getDataBaseLastSyncDate = function() {
        return _resource && _resource.lastSyncedDate;
    };

    this.putTableResource = function(tbl, definition) {
        _resource.resourceManager[tbl] = definition;
        return this;
    };

    this.getTableNames = function() {
        return _resource && _resource.resourceManager && Object.keys(_resource.resourceManager);
    };

    this.addTableToResource = function(tableName, data) {
        if ($isArray(_resource.resourceManager)) {
            _resource.resourceManager = {};
        }
        _resource.resourceManager[tableName] = data;
    }
}
/**
 * 
 * @param {*} tbl 
 */
ResourceManager.prototype.removeTableFromResource = function(tbl) {
    var resourceControl = this.getResource();
    if (resourceControl && resourceControl.resourceManager.hasOwnProperty(tbl)) {
        delete resourceControl.resourceManager[tbl];
        this.setResource(resourceControl);
    }
};

/**
 * 
 * @param {*} oldName 
 * @param {*} newName 
 */
ResourceManager.prototype.renameTableResource = function(oldName, newName) {
    var resourceControl = this.getResource();
    if (resourceControl && resourceControl.resourceManager.hasOwnProperty(oldName)) {
        resourceControl.resourceManager[newName] = resourceControl.resourceManager[oldName];
        delete resourceControl.resourceManager[oldName];
        resourceControl.resourceManager[newName].lastUpdated = +new Date;
        resourceControl.resourceManager[newName].lastSyncedDate = null;
        this.setResource(resourceControl);
    }
};

ResourceManager.prototype.getTableDifferences = function(resource) {
    var tables = this.getTableNames();
    var resourceControl = this.getResource();
    if (!resource) {
        return tables;
    }

    return tables.reduce(function(accum, tbl) {
        if (resource.resourceManager && resource.resourceManager.hasOwnProperty(tbl)) {
            if (resourceControl.resourceManager[tbl]._hash !== resource.resourceManager[tbl]._hash)
                accum.push(tbl);
        } else {
            accum.push(tbl);
        }

        return accum;
    }, []);
};