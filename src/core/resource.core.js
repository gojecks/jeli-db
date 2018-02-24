//queryDB resourceManager

function resourceManager(name) {
    var _resource = null,
        _resourceName = $queryDB.$dbName + "_" + name;

    this.getResource = function() {
        return _resource || getStorageItem(_resourceName);
    };

    /**
     * 
     * @param {*} resource 
     */
    this.setResource = function(resource) {
        _resource = resource || _resource;
        //set and save the resource
        setStorageItem(_resourceName, _resource);
    };

    this.$isExists = function() {
        return !_resource;
    };

    this.removeResource = function() {
        _resource = null;
        return delStorageItem(_resourceName);
    };

    this.getTableLastSyncDate = function(tbl) {
        return _resource && _resource.resourceManager.hasOwnProperty(tbl) && _resource.resourceManager[tbl].lastSyncedDate;
    };

    this.putTableResource = function(tbl, definition) {
        _resource.resourceManager[tbl] = definition;
        return this;
    }
}
/**
 * 
 * @param {*} tbl 
 */
resourceManager.prototype.removeTableFromResource = function(tbl) {
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
resourceManager.prototype.renameTableResource = function(oldName, newName) {
    var resourceControl = this.getResource();
    if (resourceControl && resourceControl.resourceManager.hasOwnProperty(oldName)) {
        resourceControl.resourceManager[newName] = resourceControl.resourceManager[oldName];
        delete resourceControl.resourceManager[oldName];
        resourceControl.resourceManager[newName].lastUpdated = +new Date;
        resourceControl.resourceManager[newName].lastSyncedDate = null;
        this.setResource(resourceControl);
    }
};