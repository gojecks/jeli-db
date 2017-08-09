//Extend _privateApi Functionality
//set a new Method $getTable()
//Function Name : $getTable
//@Arguments : DB_NAME {STRING}, tableName {STRING}
function _privateApi(){
    //setup our DBName
    this.$dbName = "_resourceManager";
    this.accessStorage = 'jEliAccessToken';
    this.stack = [];
    this.$delRecordName = '_deletedRecordsManager';
    this.$taskPerformer = _privateTaskPerfomer(this);
    this.$activeDB = null;
    this.openedDB = new openedDBHandler();
    this.$setActiveDB = function(name) {
        // open the DB
        this.openedDB.$new(name, new openedDBHandler());

        this.$activeDB = name;
        return this;
    };

    this.$set = function(name, data) {
        this[name] = data;
        return this;
    };

    this.$get = function(name) {
        return this[name];
    };

    this.$getTable = function(dbName, tableName) {
        if (tableName && dbName && this[dbName] && this[dbName].tables[tableName]) {
            return this[dbName].tables[tableName]
        }
        return false;
    };

    this.$getTableOptions = function(dbName, tableName, option){
        return (this.$getTable(dbName, tableName) || {})[option];
    };

    this.$getDataByRef = function(data, ref){
        return [].filter.call(data, function(item){
            return item._ref === ref;
        })[0];
    };

    this.removeTable = function(tbl, db) {
        return delete this[db].tables[tbl];
    };

    this.storageEventHandler = new $eventStacks();

    //_privateApi initializer
    defineProperty(this.stack, "push", function() {
        fireEvent.apply(null, arguments); // assign/raise your event
        return 0;
    });
}

_privateApi.prototype.$mergeTable = function(records, tbl) {
    var $promise = new $p();
    if (records && tbl) {
        var $dDB = this.$get(this.$activeDB);
        if ($dDB && $dDB.tables[tbl]) {
            this.$newTable(this.$activeDB, tbl, records);
            $promise.resolve({ status: 'success', message: 'Table(' + tbl + ') updated successfully', code: 200 });
        } else {
            $promise.reject({ status: 'error', message: 'Unable to merge Table(' + tbl + ')', code: 403 });
        }
    } else {
        //undefined Table and Records
        $promise.reject({ status: 'error', message: 'Undefined Records and Table', code: 404 });
    }

    return $promise;
};

_privateApi.prototype.$resolveUpdate = function(db, tbl, data) {
    var $promise = new $p();
    if (db && tbl && data) {
        var tbl = this.$getTable(db, tbl),
            types = ["insert", "delete", "update"],
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
                _ret['delete'].push(item._ref);
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
                    $queryDB.storageEventHandler.broadcast(eventNamingIndex(db, name), [tbl.TBL_NAME, data[name]]);
                }
            });
            $promise.resolve(_ret);
        }
        } else {
            $promise.reject();
        }

    return $promise;
};

_privateApi.prototype.getDbTablesNames = function(db){
    return Object.keys(this[db || this.$activeDB].tables);
};

_privateApi.prototype.removeDB = function(db) {
    if (this[db]) {
        delete this[db];
        delStorageItem(db);
        updateDeletedRecord('database', { name: db });
        return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped');
    }

    return dbErrorPromiseObject('Unable to drop Database(' + db + ')');
};

_privateApi.prototype.$newTable = function(db, tbl, obj) {
    this[db].tables[tbl] = obj;
    return true;
};

_privateApi.prototype.$updateTableData = function(tbl, data) {
    var tblRecord = this[this.$activeDB].tables[tbl];
    if (tblRecord) {
        tblRecord.data.push.apply(tblRecord.data, data);
    }

    return this;
};

_privateApi.prototype.getTableCheckSum = function(db, tbl) {
    return this.$getTable(db, tbl).$hash;
};

_privateApi.prototype.isOpen = function(name) {
    if (this.$get(name)) {
        return true
    }

    this.openedDB.$get(name).$new('resolvers', new openedDBResolvers());
    this.openedDB.$get(name).$new('resourceManager', new resourceManager(name));
    this.openedDB.$get(name).$new('recordResolvers', new DBRecordResolvers(name));
};

_privateApi.prototype.closeDB = function(name, removeFromStorage) {
    delete this.openedDB[name];
    if (removeFromStorage) {
        this.removeDB(name);
    }

};

_privateApi.prototype.$getActiveDB = function(req) {
    return this.openedDB.$get(req || this.$activeDB);
};


_privateApi.prototype.getNetworkResolver = function(name, db) {
    return this.$getActiveDB(db).$get('resolvers').getResolvers(name) || '';
};
//generate a nonce
//to protect CSRF
_privateApi.prototype.getNonce = function(name) {
    //set new update
    var nonce = this.getNetworkResolver('nonce', name);
    return nonce;
};

_privateApi.prototype.buildOptions = function(dbName, tbl, requestState) {
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

_privateApi.prototype.setStorage = function(config, callback) {

    if(this.$get(this.$activeDB)){
        callback();
        return;
    }

    var _storage = config.storage || 'localStorage';
    // check for storage type
    switch (_storage.toLowerCase()) {
        case ('indexeddb'):
            this.$getActiveDB().$new('_storage_', new indexedDBStorage(callback));
        break;
        case ('sqlite'):
        case ('sqlitecipher'):
        case ('websql'):
            if($inArray(_storage.toLowerCase(),['sqlite','sqlitecipher']) && !window.sqlitePlugin){
                _storage = "websql";
            }

            var sqliteConfig = {
                name: this.$activeDB,
                location: config.location || 'default',
                key:config.key || GUID()
            };

            this.$getActiveDB().$new('_storage_', new sqliteStorage(_storage, sqliteConfig, callback).mockLocalStorage());
        break;
        case ('localstorage'):
        case ('sessionstorage'):
        case ('memory'):
        default:
            //setStorage
            //default storage to localStorage
            this.$getActiveDB().$new('_storage_', $isSupport.localStorage && new jDBStorage(_storage) );
            callback();
        break;
    }
};


function openedDBHandler(){
    var _openedDB = {};

    this.$new = function(name, value){
        if(!_openedDB[name]){
            _openedDB[name] = value;
        }

        return this;
    };

    this.$get = function(name){
        return _openedDB[name];
    };

    this.$destroy = function(name){
        _openedDB[name] = null;
    };
}

// create a new privateApi Instance
var $queryDB = new _privateApi(),
    $provider = $provider || null;
