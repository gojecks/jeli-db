var privateApi = (function() {
    /**
     * Database INTERNAL CLASS
     */
    function AbstractApi() {
        var _this = this;
        //setup our DBName
        this.accessStorage = 'jEliAccessToken';
        this.stack = [];
        this._activeDatabase = null;
        this.databaseContainer = new AbstractContainer();
        this.storeMapping = {
            delRecordName: "_d_",
            resourceName: "_r_",
            pendingSync: "_l_"
        };

        //AbstractApi initializer
        defineProperty(this.stack, "push", function() {
            // assign/raise your event
            fireEvent.apply(null, arguments);
            return 0;
        });

        this.storageFacade = {
            get: function(item, db) {
                return _this.getActiveDB(db).get(constants.STORAGE).getItem(item);
            },
            remove: function(name) {
                _this.getActiveDB().get(constants.STORAGE).removeItem(name);
                return true;
            },
            set: function(key, value, db) {
                if (key && value) {
                    _this.getActiveDB(db).get(constants.STORAGE).setItem(key, value);
                }
            },
            broadcast: function(db, eventName, args) {
                _this.getActiveDB(db).get(constants.STORAGE).broadcast(eventName, args);
            }
        };
    }

    /**
     * 
     * @param {*} name 
     */
    AbstractApi.prototype.setActiveDB = function(name) {
        // open the DB
        if (!this.databaseContainer.has(name)) {
            this.databaseContainer.createInstance(name);
            this._activeDatabase = name;
        } else if (!isequal(this._activeDatabase, name)) {
            this._activeDatabase = name;
        }

        return this;
    };

    AbstractApi.prototype.tableExists = function(dbName, tableName) {
        return this.databaseContainer.get(dbName).get(constants.STORAGE).isExists(tableName);
    }

    /**
     * 
     * @param {*} name 
     * @param {*} properties 
     */
    AbstractApi.prototype.get = function(name, properties) {
        if (!this.databaseContainer.has(name)) {
            return null;
        }

        var _db = this.databaseContainer.get(name).get(constants.STORAGE).getItem();
        if (properties) {
            if (isarray(properties)) {
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
    AbstractApi.prototype.getTable = function(dbName, tableName, extendable) {
        var db = this.databaseContainer.get(dbName).get(constants.STORAGE);
        var ret = null;

        if (!db.isExists(tableName)) {
            return ret;
        }

        ret = Object(db.getItem(tableName) || null);

        return ret;
    };

    /**
     * use this api to get table data
     * @param {*} dbName 
     * @param {*} tableName 
     * @returns
     */
    AbstractApi.prototype.getTableData = function(dbName, tableName) {
        var db = this.databaseContainer.get(dbName).get(constants.STORAGE);
        /**
         * check for table existence
         */
        if (!db || !db.isExists(tableName)) return [];

        return db.getItem(tableName + ":data");
    }

    /**
     * 
     * @param {*} data 
     * @param {*} refs 
     */
    AbstractApi.prototype.getDataByRefs = function(data, refs) {
        return [].filter.call(data, function(item) {
            return refs.includes(item._ref);
        });
    };

    AbstractApi.prototype.generateStruct = function(cache) {
        var ret = { tables: {}, version: cache.version };
        var resources = cache[this.storeMapping.resourceName];
        if (resources && resources.resourceManager) {
            Object.keys(resources.resourceManager).forEach(attachObject);
        }

        function attachObject(tbl) {
            if (cache.hasOwnProperty(tbl)) {
                Object.defineProperty(ret.tables, tbl, {
                    get: function() {
                        return cache[tbl]
                    },
                    enumerable: true
                });
            }
        }
        return ret;
    };

    /**
     * 
     * @param {*} db 
     */
    AbstractApi.prototype.getDbTablesNames = function(db) {
        return Object.keys(this.get(db || this._activeDatabase, 'tables'));
    };


    /**
     * 
     * @param {*} db 
     * @param {*} tbl 
     */
    AbstractApi.prototype.getTableCheckSum = function(db, tbl) {
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
    AbstractApi.prototype.isOpen = function(name) {
        var _openedDB = this.databaseContainer.get(name);
        if (_openedDB.opened) {
            return true
        }

        if (_openedDB.closed) {
            _openedDB
                .open()
                .incrementInstance();
            return;
        }

        _openedDB
            .open()
            .set(constants.DATATYPES, new DataTypeHandler())
            .set(constants.RESOLVERS, new openedDBResolvers())
            .set(constants.RESOURCEMANAGER, new ResourceManager(name))
            .set(constants.RECORDRESOLVERS, new CoreDataResolver(name));


        _openedDB = null;
    };

    /**
     * 
     * @param {*} name 
     * @param {*} removeFromStorage 
     */
    AbstractApi.prototype.closeDB = function(name, removeFromStorage) {
        var openedDb = this.databaseContainer.get(name);
        if (!openedDb) {
            return;
        }

        openedDb.decrementInstance();
        if (!openedDb.instance) {
            openedDb.close();
            if (removeFromStorage) {
                openedDb
                    .get(constants.RESOURCEMANAGER)
                    .removeResource();
                // destroy the DB instance
                this.storageFacade.remove(name);
                this.databaseContainer.destroy(name);
            }
        }

    };

    /**
     * 
     * @param {*} req 
     */
    AbstractApi.prototype.getActiveDB = function(requestDB) {
        return this.databaseContainer.get(requestDB || this._activeDatabase);
    };

    /**
     * 
     * @param {*} name 
     * @param {*} db 
     */
    AbstractApi.prototype.getNetworkResolver = function(prop, db) {
        return this.getActiveDB(db).get(constants.RESOLVERS).getResolvers(prop) || '';
    };

    /**
     * remove the required application
     * @param {*} db 
     * @param {*} forceDelete 
     */
    AbstractApi.prototype.removeDB = function(db, forceDelete) {
        /**
         * check if database exists before proceeding
         */
        if (this.databaseContainer.has(db)) {
            var databaseInstance = this.getActiveDB(db);
            var _resource = databaseInstance.get(constants.RESOURCEMANAGER);
            var databaseResources = (_resource.getResource() || {});
            var removeAll = (databaseResources.lastSyncedDate && !forceDelete);
            databaseInstance.close();

            // destroy the DB instance
            // drop all tables
            var tableList = _resource.getTableNames();
            if (tableList) {
                tableList.forEach(function(tableName) {
                    privateApi.storageFacade.broadcast(db, DB_EVENT_NAMES.DROP_TABLE, [tableName]);
                });
            }
            // remove other storage
            var storage = databaseInstance.get(constants.STORAGE);
            storage.removeItem(this.storeMapping.pendingSync);
            storage.removeItem('version');
            _resource.removeResource();


            /**
             * only store deleted records when db is synced
             */
            if (removeAll) {
                this.updateDeletedRecord('database', {
                    db: db,
                    lastSyncedDate: databaseResources.lastSyncedDate
                });
            } else {
                databaseInstance.get(constants.RECORDRESOLVERS).destroy();
                this.databaseContainer.destroy(db);
            }

            databaseInstance = _resource = null;

            return dbSuccessPromiseObject('drop', 'Database(' + db + ') have been dropped.');
        }

        return dbErrorPromiseObject('Unable to drop Database(' + db + ') or it does not exists.');
    };

    /**
     * 
     * @param {*} config 
     * @param {*} callback 
     */
    AbstractApi.prototype.setStorage = function(dbName, config, callback) {
        if (this.databaseContainer.get(dbName).has(constants.STORAGE)) {
            callback();
            return;
        }

        /**
         * default storage to memory
         * when invalid storage property
         */
        var storageInit = Database.storageAdapter.get(config.storage || 'memory');
        var _activeDBInstance = this.getActiveDB(dbName);

        if (isfunction(storageInit)) {
            var dbToStorageInstance = Object.create({
                generateStruct: this.generateStruct,
                eventNames: DB_EVENT_NAMES,
                storeMapping: this.storeMapping
            });

            _activeDBInstance.set(constants.STORAGE, new storageInit({
                type: config.storage,
                name: dbName,
                location: config.location || 'default',
                key: config.key || GUID(),
                folderPath: config.folderPath || '/tmp/',
            }, dbToStorageInstance, callback));
        } else {
            errorBuilder(config.storage + " doesn't exists");
        }
    };

    /**
     * 
     * @param {*} db 
     * @param {*} tbl 
     * @param {*} data 
     */
    AbstractApi.prototype.resolveUpdate = function(db, tbl, data) {
        var _this = this;
        return new DBPromise(function(resolve, reject) {
            if (db && tbl && data) {
                var tblData = _this.getTableData(db, tbl);
                var exisitingRefs = tblData.map(function(item) { return item._ref; });
                var types = ["insert", "delete", "update"];
                var _ret = { update: [], "delete": [], insert: [] };
                var _task = Object.create({
                    update: function(cdata) {
                        return cdata.reduce(function(accum, item) {
                            var idx = exisitingRefs.indexOf(item._ref);
                            if (idx > -1) {
                                Object.assign(tblData[idx]._data, item._data);
                                _ret.update.push(item._data);
                                accum.push(item);
                            }

                            return accum;
                        }, []);
                    },
                    delete: function(cdata) {
                        tblData = tblData.filter(function(item) {
                            return !inarray(item._ref, cdata);
                        });
                        _ret['delete'] = cdata;
                        return cdata;
                    },
                    insert: function(cdata) {
                        return cdata.reduce(function(accum, item) {
                            if (!exisitingRefs.includes(item._ref)) {
                                tblData.push(item);
                                _ret.insert.push(item._data);
                                accum.push(item);
                            }

                            return accum;
                        }, []);
                    }
                });

                if (tbl) {
                    for (var i = 0; i < types.length; i++) {
                        var type = types[i];
                        if (data.hasOwnProperty(type) && data[type] && data[type].length) {
                            var eventValue = _task[type](data[type]);
                            _this.storageFacade.broadcast(db, type, [tbl, eventValue, false]);
                        }
                    }

                    var deepCloneRet = copy(_ret, true);
                    resolve(deepCloneRet);
                    deepCloneRet = null;
                }
            } else {
                reject();
            }
        });
    };

    /**
     * 
     * @param {*} dbName 
     * @param {*} options: {tbl, path, method}
     * @returns 
     */
    AbstractApi.prototype.buildHttpRequestOptions = function(dbName, reqOptions) {
        var options = {};
        var networkResolver = this.getActiveDB(dbName).get(constants.RESOLVERS).networkResolver;
        // requestState can either be a STRING or OBJECT { URL:STRING, tbl:String, AUTH_TYPE:Boolean}
        var requestState = networkResolver.requestMapping.get(reqOptions.path, reqOptions.method);
        if (requestState) {
            var cToken = $cookie('X-CSRF-TOKEN');
            var tbl = reqOptions.tbl || requestState.tbl;
            var cache = reqOptions.cache || requestState.CACHE || null;
            if (isarray(tbl)) {
                tbl = JSON.stringify(tbl);
            }
            /**
             * configure request options
             */
            options = Object({
                url: (networkResolver.serviceHost || '') + requestState.URL,
                __appName__: dbName,
                type: requestState.METHOD,
                data: {
                    _r: Base64Fn.encode(dbName + ':' + (tbl || '') + ':' + +new Date + ':' + networkResolver.nonce)
                },
                dataType: "json",
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer *",
                    'X-APP-ORGANISATION': networkResolver.organisation || '',
                    'X-APP-NAME': dbName
                },
                requestState: requestState,
                cache: cache
            });
            /**
             * set X-CSRF-TOKEN
             * only when defined
             */
            if (cToken) {
                options.headers['X-CSRF-TOKEN'] = cToken;
            }
            //initialize our network interceptor
            if (networkResolver.interceptor) {
                networkResolver.interceptor(options, requestState);
            }
        } else {
            options.isErrorState = true;
        }
        // remove networkResolver instance
        networkResolver = null;
        return options;
    };

    /**
     * 
     * @param {*} name 
     * @param {*} tblName 
     * @param {*} updateFn 
     * @param {*} lastSynced 
     */
    AbstractApi.prototype.updateDB = function(name, tblName, updateFn, lastSynced) {
        var openedDb = this.getActiveDB(name);
        //put the data to DB
        if (openedDb) {
            //update the table lastModified
            var table = this.getTable(name, tblName);
            if (table) {
                var ret = {
                    lastModified: +new Date,
                    _hash: table._hash,
                    _previousHash: table._previousHash
                };

                if (isfunction(updateFn)) {
                    updateFn.apply(updateFn, [ret]);
                }

                this.storageFacade.broadcast(name, DB_EVENT_NAMES.UPDATE_TABLE, [tblName, ret]);
            }

            /**
             * update Database resource
             */
            var resourceManager = openedDb.get(constants.RESOURCEMANAGER);
            var dbRef = resourceManager.getResource();
            if (dbRef) {
                if (table) {
                    // new synced table
                    if (!dbRef.resourceManager[tblName]) {
                        resourceManager.addTableToResource(tblName, {
                            lastModified: table.lastModified,
                            _hash: table._hash,
                            created: table.created || +new Date
                        });
                    }
                }
                /**
                 * set last sync date for table
                 */
                if (dbRef.resourceManager && dbRef.resourceManager.hasOwnProperty(tblName)) {
                    dbRef.resourceManager[tblName].lastSyncedDate = lastSynced || dbRef.resourceManager[tblName].lastSyncedDate || null;
                }
                dbRef.lastUpdated = +new Date;
                dbRef.lastSyncedDate = lastSynced || dbRef.lastSyncedDate;
                //update
                resourceManager.setResource(dbRef);
            }
        }
    };

    /**
     * 
     * @param {*} ref 
     * @param {*} obj 
     */
    AbstractApi.prototype.updateDeletedRecord = function(ref, obj) {
        var checker = this.storageFacade.get(this.storeMapping.delRecordName);
        var resolvers = this.getActiveDB(obj.db).get(constants.RESOLVERS);
        if (checker && checker[obj.db]) {
            resolvers.register('deletedRecords', checker[obj.db]);
        } else {
            checker = {};
            checker[obj.db] = {};
        }
        //Update the resource control
        //only when its table
        var delRecords = resolvers.getResolvers('deletedRecords');
        var refActions = {
            table: function() {
                delRecords[ref][obj.name] = obj._hash || GUID();
                if (delRecords['rename'][obj.name]) {
                    delete delRecords['rename'][obj.name];
                }
            },
            rename: function() {
                delRecords[ref][obj.oldName] = obj.newName;
            },
            database: function() {
                delRecords[ref][obj.db] = {
                    hash: obj._hash || GUID(),
                    time: +new Date
                };
            }
        };

        (refActions[ref] || function() {})();
        //extend the delete Object
        //with the current deleteResolver
        checker[obj.db] = delRecords;
        this.storageFacade.set(this.storeMapping.delRecordName, checker);
    }

    /**
     * 
     * @param {*} options 
     */
    AbstractApi.prototype.$http = function() {
        var interceptor = Object.create({
            resolveInterceptor: function(type, options) {
                if (_globalInterceptors.has(type)) {
                    _globalInterceptors.get(type).forEach(function(interceptor) {
                        interceptor(options);
                    });
                }
                return options;
            }
        });
        var $ajax = AjaxSetup(interceptor);
        var checkedUserDefined = false;
        var userDefinedAjax = null;
        return function(options) {
            // one time  check for user custom ajax
            if (!checkedUserDefined) {
                checkedUserDefined = true;
                userDefinedAjax = this.getNetworkResolver('$ajax', options.__appName__);
            }

            // use userDefined Ajax if configured
            if (userDefinedAjax) {
                return userDefinedAjax(options);
            }

            return $ajax(options);
        };
    }();



    return (new AbstractApi);
})();