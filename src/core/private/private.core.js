/**
 * JELIDB INTERNAL CLASS
 */
function CoreInstance() {
    //setup our DBName
    this.accessStorage = 'jEliAccessToken';
    this.stack = [];
    this.$taskPerformer = _privateTaskPerfomer();
    this.$activeDB = null;
    this.openedDB = new openedDBHandler();
    this.storageEventHandler = new $EventEmitters();
    this.storeMapping = {
        delRecordName: "_d_",
        resourceName: "_r_",
        pendingSync: "_l_"
    };

    //CoreInstance initializer
    defineProperty(this.stack, "push", function() {
        // assign/raise your event
        fireEvent.apply(null, arguments);
        return 0;
    });
}

/**
 * 
 * @param {*} name 
 */
CoreInstance.prototype.setActiveDB = function(name) {
    // open the DB
    if (!this.openedDB.has(name)) {
        this.openedDB.new(name, new openedDBHandler());
        this.$activeDB = name;
    } else if (!$isEqual(this.$activeDB, name)) {
        this.$activeDB = name;
    }

    return this;
};

/**
 * 
 * @param {*} name 
 * @param {*} data 
 */
CoreInstance.prototype.set = function(name, data) {
    // this.openedDB.get(name).set('_db_', data);
    this.openedDB.get(name).get('_storage_').setItem(name, data);
    return this;
};

/**
 * 
 * @param {*} name 
 * @param {*} properties 
 */
CoreInstance.prototype.get = function(name, properties) {
    if (!this.openedDB.has(name)) {
        return null;
    }

    var _db = this.openedDB.get(name).get('_storage_').getItem();
    if (properties) {
        if ($isArray(properties)) {
            var _ret = {};
            properties.forEach(function(key) {
                _ret[key] = _db[key];
            });

            return _ret;
        }

        return _db[properties];
    }

    return _db;
};

/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 */
CoreInstance.prototype.getTable = function(dbName, tableName, extendable) {
    var db = this.openedDB.get(dbName).get('_storage_'),
        ret = null;

    if (!db.isExists(tableName)) {
        return ret;
    }

    if (extendable) {
        ret = extend(true, db.getItem(tableName));
    } else {
        ret = Object.create(db.getItem(tableName));
    }
    ret.data = db.getItem(tableName + ":data");
    return ret;
};

/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 * @param {*} option 
 */
CoreInstance.prototype.getTableOptions = function(dbName, tableName, option) {
    return (this.getTable(dbName, tableName) || {})[option];
};

/**
 * 
 * @param {*} data 
 * @param {*} ref 
 */
CoreInstance.prototype.getDataByRef = function(data, ref) {
    return [].filter.call(data, function(item) {
        return item._ref === ref;
    })[0];
};

CoreInstance.prototype.generateStruct = function(cache) {
    var ret = { tables: {}, version: cache.version };
    if (cache.hasOwnProperty(this.storeMapping.resourceName)) {
        Object.keys(cache[this.storeMapping.resourceName].resourceManager).forEach(function(tbl) {
            if (cache.hasOwnProperty(tbl)) {
                ret.tables[tbl] = Object.create(cache[tbl]);
                Object.defineProperty(ret.tables[tbl], 'data', {
                    get: function() {
                        return cache[this.TBL_NAME + ":data"]
                    },
                    set: function(value) {
                        cache[this.TBL_NAME + ":data"] = value;
                    }
                });
            }
        });
    }
    return ret;
}

/**
 * 
 * @param {*} db 
 */
CoreInstance.prototype.getDbTablesNames = function(db) {
    return Object.keys(this.get(db || this.$activeDB, 'tables'));
};

/**
 * 
 * @param {*} oldName 
 * @param {*} newName 
 */
CoreInstance.prototype.renameDataBase = function(oldName, newName, cb) {
    var oldInstance = this.getActiveDB(oldName),
        self = this;
    oldInstance.get('_storage_').rename(oldName, newName, function() {
        cb();
        self.closeDB(oldName, true);
    });
};

/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 */
CoreInstance.prototype.getTableCheckSum = function(db, tbl) {
    var table = this.getTable(db, tbl);
    return ({
        current: table._hash,
        previous: table._previousHash
    });
};

/**
 * 
 * @param {*} name 
 */
CoreInstance.prototype.isOpen = function(name) {
    var _openedDB = this.openedDB.get(name);
    if (_openedDB.get('open')) {
        return true
    }

    if (_openedDB.has('closed')) {
        _openedDB
            .set('open', true)
            .incrementInstance()
            .destroy('closed');
        return;
    }

    _openedDB
        .set('open', true)
        .set('dataTypes', new DataTypeHandler())
        .new('resolvers', new openedDBResolvers())
        .new('resourceManager', new ResourceManager(name))
        .new('recordResolvers', new CoreDataResolver(name));

    _openedDB = null;

};

/**
 * 
 * @param {*} name 
 * @param {*} removeFromStorage 
 */
CoreInstance.prototype.closeDB = function(name, removeFromStorage) {
    var openedDb = this.openedDB.get(name);
    if (!openedDb) {
        return;
    }

    openedDb.decrementInstance();
    if (openedDb.get('instance') < 1) {
        openedDb
            .set('open', false)
            .set('closed', true);

        if (removeFromStorage) {
            openedDb
                .get('resourceManager')
                .removeResource();
            // destroy the DB instance
            delStorageItem(name);
            this.openedDB.destroy(name);
        }
    }

};

/**
 * 
 * @param {*} req 
 */
CoreInstance.prototype.getActiveDB = function(requestDB) {
    return this.openedDB.get(requestDB || this.$activeDB);
};

/**
 * 
 * @param {*} name 
 * @param {*} db 
 */
CoreInstance.prototype.getNetworkResolver = function(prop, db) {
    return this.getActiveDB(db).get('resolvers').getResolvers(prop) || '';
};
// create a new privateApi Instance
var privateApi = new CoreInstance();