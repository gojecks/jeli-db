/**
 * ResourceManager()
 * @param {*} name 
 */
class ResourceManager {
    constructor(appName) {
        this.appName = appName;
        this._resource = privateApi.storageFacade.get(privateApi.storeMapping.resourceName, this.name) || {};
    }

    getResource() {
        return this._resource || privateApi.storageFacade.get(privateApi.storeMapping.resourceName, this.appName);
    };

    /**
     *
     * @param {*} resource
     */
    setResource(resource, _name) {
        this._resource = resource || this._resource;
        //set and save the resource
        privateApi.storageFacade.set(_name || privateApi.storeMapping.resourceName, this._resource, this.appName);
    }

    $isExists() {
        return !!this._resource;
    }

    renameResource(newName) {
        var resource = this.getResource();
        resource.lastUpdated = +new Date;
        this.appName = newName;
        this.setResource(resource);
    }

    removeResource() {
        this._resource = null;
        return privateApi.storageFacade.remove(privateApi.storeMapping.resourceName, this.appName);
    }

    getTableLastSyncDate(tbl) {
        return this._resource && this._resource.resourceManager.hasOwnProperty(tbl) && this._resource.resourceManager[tbl].lastSyncedDate;
    }

    getDataBaseLastSyncDate() {
        return this._resource && this._resource.lastSyncedDate;
    }

    putTableResource(tbl, definition) {
        this._resource.resourceManager[tbl] = definition;
        return this;
    }

    getTableNames() {
        return this._resource && this._resource.resourceManager && Object.keys(this._resource.resourceManager);
    }

    addTableToResource = function (tableName, data) {
        if (isarray(this._resource.resourceManager) || !this._resource.resourceManager) {
            this._resource.resourceManager = {};
        }
        this._resource.resourceManager[tableName] = data;
    }

    /**
     *
     * @param {*} tbl
     */
    removeTableFromResource(tbl) {
        var resourceControl = this.getResource();
        if (resourceControl && resourceControl.resourceManager.hasOwnProperty(tbl)) {
            delete resourceControl.resourceManager[tbl];
            this.setResource(resourceControl);
        }
    }
    /**
     *
     * @param {*} oldName
     * @param {*} newName
     */
    renameTableResource(oldName, newName) {
        var resourceControl = this.getResource();
        if (resourceControl && resourceControl.resourceManager.hasOwnProperty(oldName)) {
            resourceControl.resourceManager[newName] = resourceControl.resourceManager[oldName];
            delete resourceControl.resourceManager[oldName];
            resourceControl.resourceManager[newName].lastUpdated = +new Date;
            resourceControl.resourceManager[newName].lastSyncedDate = null;
            this.setResource(resourceControl);
        }
    }
    getTableDifferences(resource) {
        var tables = this.getTableNames();
        if (!resource || !tables) {
            return tables || [];
        }

        var resourceControl = this.getResource();
        return tables.reduce(function (accum, tbl) {
            if (resource.resourceManager && resource.resourceManager.hasOwnProperty(tbl)) {
                if (resourceControl.resourceManager[tbl]._hash !== resource.resourceManager[tbl]._hash)
                    accum.push(tbl);
            } else {
                accum.push(tbl);
            }

            return accum;
        }, []);
    }
}


