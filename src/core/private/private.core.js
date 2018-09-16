/**
 * JELIDB INTERNAL CLASS
 */
function _privateApi() {
    //setup our DBName
    this.$dbName = "_resourceManager";
    this.accessStorage = 'jEliAccessToken';
    this.stack = [];
    this.$delRecordName = '_deletedRecordsManager';
    this.$taskPerformer = _privateTaskPerfomer(this);
    this.$activeDB = null;
    this.openedDB = new openedDBHandler();

    /**
     * 
     * @param {*} name 
     */
    this.$setActiveDB = function(name) {
        // open the DB
        if (!this.openedDB.$hasOwnProperty(name)) {
            this.openedDB.$new(name, new openedDBHandler({ open: false }));
            this.$activeDB = name;
        } else if (!$isEqual(this.$activeDB, name)) {
            this.$activeDB = name;
        }

        return this;
    };

    this.getResourceName = function(db) {
        return this.$dbName + "_" + db;
    };

    this.getDataResolverName = function(dbName) {
        return "_l_" + dbName;
    };

    /**
     * 
     * @param {*} name 
     * @param {*} data 
     */
    this.$set = function(name, data) {
        this.openedDB.$get(name).$set('_db_', data);
        return this;
    };

    /**
     * 
     * @param {*} name 
     * @param {*} properties 
     */
    this.$get = function(name, properties) {
        if (!this.openedDB.$hasOwnProperty(name)) {
            return null;
        }

        var _db = this.openedDB.$get(name).$get('_db_');
        if (_db && properties) {
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
    this.$getTable = function(dbName, tableName) {
        var _tbl = this.$get(dbName, 'tables');
        if (_tbl && _tbl.hasOwnProperty(tableName)) {
            return _tbl[tableName];
        }
        return false;
    };

    /**
     * 
     * @param {*} dbName 
     * @param {*} oldTable 
     * @param {*} newTable 
     * @param {*} removeTable 
     */
    this.replicateTable = function(dbName, oldTable, newTable, removeTable) {
        var currentDB = this.$get(dbName);
        if (currentDB && currentDB.tables[oldTable]) {
            currentDB.tables[newTable] = currentDB.tables[oldTable];
            currentDB.tables[newTable].TBL_NAME = newTable;
            if (removeTable) {
                delete currentDB.tables[oldTable];
            }
        }
    };

    /**
     * 
     * @param {*} dbName 
     * @param {*} tableName 
     * @param {*} option 
     */
    this.$getTableOptions = function(dbName, tableName, option) {
        return (this.$getTable(dbName, tableName) || {})[option];
    };

    /**
     * 
     * @param {*} data 
     * @param {*} ref 
     */
    this.$getDataByRef = function(data, ref) {
        return [].filter.call(data, function(item) {
            return item._ref === ref;
        })[0];
    };

    /**
     * 
     * @param {*} tbl 
     * @param {*} db 
     * @param {*} updateStorage 
     */
    this.removeTable = function(tbl, db, updateStorage) {
        if (delete this.$get(db, 'tables')[tbl] && updateStorage) {
            jEliUpdateStorage(db, tbl);
        }
    };

    this.storageEventHandler = new $eventStacks();

    //_privateApi initializer
    defineProperty(this.stack, "push", function() {
        // assign/raise your event
        fireEvent.apply(null, arguments);
        return 0;
    });
}

/**
 * 
 * @param {*} db 
 */
_privateApi.prototype.getDbTablesNames = function(db) {
    return Object.keys(this.$get(db || this.$activeDB, 'tables'));
};


/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 * @param {*} tableDefinition 
 */
_privateApi.prototype.$newTable = function(db, tbl, tableDefinition) {
    this.$get(db, 'tables')[tbl] = extend({}, tableDefinition);
    this.$taskPerformer.updateDB(db, tbl);
    return true;
};

/**
 * 
 * @param {*} tbl 
 * @param {*} data 
 */
_privateApi.prototype.$updateTableData = function(db, tbl, data) {
    var tblRecord = this.$getTable(db, tbl);
    if (tblRecord) {
        tblRecord.data.push.apply(tblRecord.data, data);
    }

    return this;
};

/**
 * 
 * @param {*} oldName 
 * @param {*} newName 
 */
_privateApi.prototype.renameDataBase = function(oldName, newName, cb) {
    var oldInstance = this.$getActiveDB(oldName),
        self = this;
    oldInstance.$get('_storage_').rename(oldName, newName, function() {
        cb();
        self.closeDB(oldName, true);
    });
};

/**
 * 
 * @param {*} db 
 * @param {*} tbl 
 */
_privateApi.prototype.getTableCheckSum = function(db, tbl) {
    return this.$getTable(db, tbl).$hash;
};

/**
 * 
 * @param {*} name 
 */
_privateApi.prototype.isOpen = function(name) {
    var _openedDB = this.openedDB.$get(name),
        self = this;
    if (_openedDB.$get('open')) {
        return true
    }

    if (_openedDB.$hasOwnProperty('closed')) {
        _openedDB
            .$set('open', true)
            .$incrementInstance()
            .$destroy('closed');
        return;
    }

    _openedDB
        .$set('open', true)
        .$set('$tableExist', function(table) {
            return self.$get(name, 'tables').hasOwnProperty(table);
        })
        .$set('dataTypes', new DataTypeHandler())
        .$new('resolvers', new openedDBResolvers())
        .$new('resourceManager', new resourceManager(name))
        .$new('recordResolvers', new DBRecordResolvers(name));

    _openedDB = null;

};

/**
 * 
 * @param {*} name 
 * @param {*} removeFromStorage 
 */
_privateApi.prototype.closeDB = function(name, removeFromStorage) {
    var openedDb = this.openedDB.$get(name);
    if (!openedDb) {
        return;
    }

    openedDb.$decrementInstance();
    if (openedDb.$get('instance') < 1) {
        openedDb
            .$set('open', false)
            .$set('closed', true);

        if (removeFromStorage) {
            openedDb
                .$get('resourceManager')
                .removeResource();
            // destroy the DB instance
            delStorageItem(name);
            this.openedDB.$destroy(name);
        }
    }

};

/**
 * 
 * @param {*} req 
 */
_privateApi.prototype.$getActiveDB = function(requestDB) {
    return this.openedDB.$get(requestDB || this.$activeDB);
};

/**
 * 
 * @param {*} name 
 * @param {*} db 
 */
_privateApi.prototype.getNetworkResolver = function(prop, db) {
    return this.$getActiveDB(db).$get('resolvers').getResolvers(prop) || '';
};
// create a new privateApi Instance
var $queryDB = new _privateApi(),
    $provider = $provider || null;