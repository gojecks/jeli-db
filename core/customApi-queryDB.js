//Extend QueryDb Functionality
//set a new Method $getTable()
//Function Name : $getTable
//@Arguments : DB_NAME {STRING}, tableName {STRING}
var $queryDB = $queryDB || {};

$queryDB.DB = ({
    openedDB: new watchBinding(),
    $setActiveDB: function(name) {
        $queryDB.$activeDB = name;

        return this;
    },
    $set: function(name, data) {
        this[name] = data;
        return this;
    },
    $get: function(name) {
        return this[name];
    },
    $getTable: function(dbName, tableName) {
        if (tableName && dbName && this[dbName]) {
            if (this[dbName].tables[tableName]) {
                return this[dbName].tables[tableName]
            }
        }
        return false;
    },
    $mergeTable: function(records, tbl) {
        var $promise = new $p();
        if (records && tbl) {
            var $dDB = this.$get($queryDB.$activeDB);
            if ($dDB && $dDB.tables[tbl]) {
                this.$newTable($queryDB.$activeDB, tbl, records);
                $promise.resolve({ status: 'success', message: 'Table(' + tbl + ') updated successfully', code: 200 });
            } else {
                $promise.reject({ status: 'error', message: 'Unable to merge Table(' + tbl + ')', code: 403 });
            }
        } else {
            //undefined Table and Records
            $promise.reject({ status: 'error', message: 'Undefined Records and Table', code: 404 });
        }

        return $promise;
    },
    $resolveUpdate: function(db, tbl, data) {
        var $promise = new $p();
        if (db && tbl && data) {
            var tbl = this.$getTable(db, tbl),
                types = ["update", "delete", "insert"],
                _task = {},
                _ret = { update: [], "delete": [], insert: [] };

            _task.update = function(cdata) {
                expect(tbl.data).search(null, function(item, idx) {
                    _ret.update.push(item._data);
                    cdata.forEach(function(obj) {
                        if (item._ref === obj._ref) {
                            tbl.data[idx] = obj;
                        }
                    });
                });
            };

            _task['delete'] = function(cdata) {
                tbl.data = tbl.data.filter(function(item) {
                    _ret['delete'].push(item._data);
                    return !$inArray(item._ref, cdata);
                });
            };

            _task.insert = function(cdata) {
                cdata.forEach(function(obj) {
                    tbl.data.push(obj);
                    _ret.insert.push(obj._data);
                });
            };

            if (tbl) {
                types.forEach(function(name) {
                    if (data[name] && data[name].length) {
                        _task[name](data[name]);
                    }
                });
                $promise.resolve(_ret);
            }
        } else {
            $promise.reject();
        }



        return $promise;
    },
    removeTable: function(tbl, db) {
        return delete this[db].tables[tbl];
    },
    removeDB: function(db) {
        if (this[db]) {
            delete this[db];
            delStorageItem(db);
            updateDeletedRecord('database', { name: db });
            return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped');
        }

        return dbErrorPromiseObject('Unable to drop Database(' + db + ')');
    },
    $newTable: function(db, tbl, obj) {
        this[db].tables[tbl] = obj;
        return true;
    },
    $updateTableData: function(tbl, data) {
        var tblRecord = this[$queryDB.$activeDB].tables[tbl];
        if (tblRecord) {
            tblRecord.data.push.apply(tblRecord.data, data);
        }

        return this;
    },
    getTableCheckSum: function(db, tbl) {
        return this.$getTable(db, tbl).$hash;
    },
    isOpen: function(name) {
        if (this.openedDB[name]) {
            return true
        }

        this.openedDB.$new(name, new watchBinding());
        this.openedDB.$get(name).$new('resolvers', new openedDBResolvers());
        this.openedDB.$get(name).$new('resourceManager', new resourceManager(name));
        this.openedDB.$get(name).$new('recordResolvers', new DBRecordResolvers(name));
    },
    closeDB: function(name, removeFromStorage) {
        delete this.openedDB[name];
        if (removeFromStorage) {
            this.removeDB(name);
        }

    }
});

$queryDB.$getActiveDB = function(req) {
    return this.DB.openedDB.$get(req || this.$activeDB);
};

//setup our DBName
$queryDB.$dbName = "_resourceManager";
$queryDB.accessStorage = 'jEliAccessToken';
$queryDB.stack = [];
$queryDB.$taskPerformer = {};
$queryDB.$delRecordName = '_deletedRecordsManager';
$queryDB.$activeDB = null;
$queryDB.getNetworkResolver = function(name, db) {
    return this.$getActiveDB(db).$get('resolvers').getResolvers(name) || '';
};
//generate a nonce
//to protect CSRF
$queryDB.getNonce = function(name) {
    //set new update
    var nonce = this.getNetworkResolver('nonce', name);
    return nonce;
};

$queryDB.buildOptions = function(dbName, tbl, requestState) {
    var options = {},
        tbl = (($isArray(tbl)) ? JSON.stringify(tbl) : tbl),
        cToken = $cookie('X-CSRF-TOKEN');

    options.url = this.getNetworkResolver('serviceHost', dbName);
    options.data = {};
    options.dataType = "json";
    options.contentType = "application/json";
    options.headers = {
        Authorization: "Bearer *"
    };

    if (cToken) {
        options.headers['X-CSRF-TOKEN'] = cToken;
    }

    //initialize our network interceptor
    (this.getNetworkResolver('interceptor', dbName) || function() {})(options, requestState);

    options.data._o = window.location.origin;
    options.data._p = window.location.pathname;
    options.data._h = window.location.host;
    options.data._r = new Base64Fn().encode(dbName + ':' + requestState + ':' + (tbl || '') + ':' + +new Date + ':' + this.getNonce(dbName));

    //options.getRequestHeader
    options.getResponseHeader = function(fn) {
        var _csrfToken = fn('X-CSRF-TOKEN');
        if (_csrfToken) {
            $cookie('X-CSRF-TOKEN', _csrfToken);
        }
    };

    return options;
};

function openedDBResolvers() {
    this.networkResolver = ({
        serviceHost: null,
        dirtyCheker: true,
        conflictResolver: null,
        logger: [],
        logService: function() {},
        interceptor: function() {},
        deletedRecords: {
            table: {},
            database: {}
        },
        handler: {
            onSuccess: function() {},
            onError: function() {}
        },
        "app_id": "*",
        inProduction: false
    });

    this.register = function(name, value) {
        if ($isObject(name) && !value) {
            this.networkResolver = extend(this.networkResolver, name);
        } else {
            this.networkResolver[name] = value;
        }

        return this;
    };

    this.getResolvers = function(name) {
        return this.networkResolver[name] || '';
    };
};

$queryDB.setStorage = function(storage, callback) {
    // check for storage type
    switch (storage.toLowerCase()) {
        case ('indexeddb'):
            this.$storage = new indexedDBStorage(callback);
            break;
        case ('sqlite'):
        case ('websql'):
            this.$storage = new sqliteStorage(storage, callback).mockLocalStorage();
            break;
        case ('localstorage'):
        default:
            //setStorage
            //default storage to localStorage
            this.$storage = $isSupport.localStorage && new jDBStorage(storage);
            callback();
            break;
    }
};


//queryDb initializer
$queryDB._init = (function(def) {
    //register stack
    //Define Watch to Stack
    return defineProperty(def.stack, "push", function() {
        fireEvent.apply(null, arguments); // assign/raise your event
        return 0;
    });
})($queryDB);