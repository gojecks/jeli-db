class privateApi {
    static accessStorage = 'jEliAccessToken';
    static stack = [];
    static _activeDatabase = null;
    static databaseContainer = new Map();
    static storeMapping = {
        delRecordName: "_d_",
        resourceName: "_r_",
        pendingSync: "_l_"
    };
    /**
    * 
    * @param {*} fn 
    */
    static fireEvent = (function () {
        'use strict';
        var inUpdateProgress = 0;
        return function (callback) {
            if (inUpdateProgress) {
                setTimeout(function () {
                    inUpdateProgress = 0;
                    callback();
                }, 1000);

                return;
            }
            callback();
            inUpdateProgress = 1;
        }
    })();

    static storageFacade = {
        get: (item, db) => {
            return privateApi.getStorage(db).getItem(item);
        },
        remove: name => {
            privateApi.getStorage().removeItem(name);
            return true;
        },
        set: (key, value, db) => {
            if (key && value) {
                privateApi.getStorage(db).setItem(key, value);
            }
        },
        broadcast: (db, eventName, args) => {
            privateApi.getStorage(db).broadcast(eventName, args);
        },
        drop: name => {
            privateApi.getStorage(name).clear();
        }
    };

    static get constants() {
        return constants
    }

    static get DB_EVENT_NAMES() {
        return DB_EVENT_NAMES
    }

    /**
     * 
     * @param {*} name 
     */
    static setActiveDB(name) {
        // open the DB
        if (!privateApi.databaseContainer.has(name)) {
            privateApi.databaseContainer.set(name, new AbstractContainer());
            privateApi._activeDatabase = name;
        } else if (!isequal(privateApi._activeDatabase, name)) {
            privateApi._activeDatabase = name;
        }

        return this;
    };

    static getStorage(db) {
        return privateApi.databaseContainer.get(db || privateApi._activeDatabase).get(constants.STORAGE);
    }

    static tableExists(dbName, tableName) {
        return privateApi.getStorage(dbName).isExists(tableName);
    }

    static renameDatabaseContainer(oldName, newName) {
        if (privateApi.databaseContainer.has(oldName)) {
            privateApi.databaseContainer.set(newName, privateApi.databaseContainer.get(oldName));
            privateApi.databaseContainer.delete(oldName)
        }
    }

    /**
     * 
     * @param {*} name 
     * @param {*} properties 
     */
    static get(name, properties) {
        if (!privateApi.databaseContainer.has(name)) {
            return null;
        }

        var _db = privateApi.getStorage(name).getItem();
        if (properties) {
            if (isarray(properties)) {
                var _ret = {};
                properties.forEach(function (key) {
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
    static getTable(dbName, tableName, extendable) {
        var db = privateApi.getStorage(dbName);
        var ret = null;

        if (!db.isExists(tableName)) {
            return ret;
        }

        ret = db.getItem(tableName) || null;

        return extendable ? Object.assign({}, ret) : ret;
    };

    /**
     * use this api to get table data
     * @param {*} dbName 
     * @param {*} tableName 
     * @returns
     */
    static getTableData(dbName, tableName) {
        var db = privateApi.getStorage(dbName);
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
    static getDataByRefs(data, refs) {
        return [].filter.call(data, function (item) {
            return refs.includes(item._ref);
        });
    };

    static generateStruct(cache) {
        var ret = { tables: {}, version: cache.version };
        var resources = cache[privateApi.storeMapping.resourceName];
        if (resources && resources.resourceManager) {
            Object.keys(resources.resourceManager).forEach(attachObject);
        }

        function attachObject(tbl) {
            if (cache.hasOwnProperty(tbl)) {
                Object.defineProperty(ret.tables, tbl, {
                    get: function () {
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
     * @param {*} removeIgnoredTables 
     * @returns 
     */
    static getDBTableNames(db, removeIgnoredTables) {
        var tableNames = Object.keys(privateApi.get(db || privateApi._activeDatabase, 'tables'));
        if (removeIgnoredTables) {
            var ignoreSync = this.getConfigData('ignoreSync', db);
            if (Array.isArray(ignoreSync))
                tableNames = tableNames.filter(tbl => !ignoreSync.includes(tbl));
        }
        return tableNames;
    };


    /**
     * 
     * @param {*} db 
     * @param {*} tbl 
     */
    static getTableCheckSum(db, tbl) {
        var table = privateApi.getTable(db, tbl);
        return ({
            current: table._hash,
            previous: table._previousHash
        });
    };

    /**
     * 
     * @param {*} name 
     */
    static isOpen(name) {
        var openedDB = privateApi.databaseContainer.get(name);
        if (openedDB.opened) {
            return true
        }

        if (openedDB.closed) {
            return !openedDB.open().incrementInstance();
        }

        openedDB
            .open()
            .set(constants.DATATYPES, new DataTypeHandler())
            .set(constants.RESOLVERS, new openedDBResolvers())
            .set(constants.RESOURCEMANAGER, new ResourceManager(name))
            .set(constants.RECORDRESOLVERS, new CoreDataResolver(name));


        openedDB = null;
    };

    /**
     * 
     * @param {*} name 
     * @param {*} removeFromStorage 
     */
    static closeDB(name, removeFromStorage) {
        var openedDb = privateApi.databaseContainer.get(name);
        if (!openedDb) return;

        openedDb.decrementInstance();
        if (!openedDb.instance) {
            openedDb.close();
            if (removeFromStorage) {
                openedDb
                    .get(constants.RESOURCEMANAGER)
                    .removeResource();
                // destroy the DB instance
                privateApi.storageFacade.drop(name);
                privateApi.databaseContainer.delete(name);
            }
        }

    };

    /**
     * 
     * @param {*} req 
     */
    static getActiveDB(requestDB) {
        return privateApi.databaseContainer.get(requestDB || privateApi._activeDatabase);
    };

    /**
     * 
     * @param {*} name 
     * @param {*} db 
     */
    static getConfigData(prop, db) {
        return privateApi.getActiveDB(db).get(constants.RESOLVERS).getResolvers(prop) || '';
    };

    /**
     * remove the required application
     * @param {*} db 
     * @param {*} forceDelete 
     */
    static removeDB(db, forceDelete) {
        /**
         * check if database exists before proceeding
         */
        if (privateApi.databaseContainer.has(db)) {
            var databaseInstance = privateApi.getActiveDB(db);
            var _resource = databaseInstance.get(constants.RESOURCEMANAGER);
            var databaseResources = (_resource.getResource() || {});
            var removeAll = (databaseResources.lastSyncedDate && !forceDelete);
            databaseInstance.close();

            // destroy the DB instance
            // drop all tables
            var tableList = _resource.getTableNames();
            if (tableList) {
                tableList.forEach(function (tableName) {
                    privateApi.storageFacade.broadcast(db, DB_EVENT_NAMES.DROP_TABLE, [tableName]);
                });
            }
            // remove other storage
            var storage = databaseInstance.get(constants.STORAGE);
            storage.removeItem(privateApi.storeMapping.pendingSync);
            storage.removeItem('version');
            _resource.removeResource();


            /**
             * only store deleted records when db is synced
             */
            if (removeAll) {
                privateApi.updateDeletedRecord('database', {
                    db: db,
                    lastSyncedDate: databaseResources.lastSyncedDate
                });
            } else {
                databaseInstance.get(constants.RECORDRESOLVERS).destroy();
                privateApi.databaseContainer.delete(db);
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
    static setStorage(dbName, config, callback) {
        if (privateApi.databaseContainer.get(dbName).has(constants.STORAGE)) {
            callback();
            return;
        }

        /**
         * default storage to memory
         * when invalid storage property
         */
        var storageInit = Database.storageAdapter.get(config.storage || 'memory');
        var _activeDBInstance = privateApi.getActiveDB(dbName);

        if (isfunction(storageInit)) {
            var dbToStorageInstance = Object.create({
                generateStruct: privateApi.generateStruct,
                eventNames: DB_EVENT_NAMES,
                storeMapping: privateApi.storeMapping
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
     * @param {*} records
     */
    static resolveUpdate(db, tbl, records) {
        var canUpdate = (db && tbl);
        var tblData = privateApi.getTableData(db, tbl);
        var exisitingRefs = tblData.map(item => item._ref);
        var types = ['insert', 'update', 'delete', 'insertReplace'].filter(key => !!records[key]);
        var _ret = {
            update: { data: [], refs: [] },
            delete: { data: [], refs: [] },
            insert: { data: [], refs: [] },
            insertReplace: { data: [], refs: [] }
        };

        /**
         * 
         * @param {*} accum 
         * @param {*} item 
         * @returns 
         */
        var pushUpdate = (accum, item) => {
            var idx = exisitingRefs.indexOf(item._ref);
            if (idx > -1) {
                Object.assign(tblData[idx]._data, item._data);
                _ret.update.data.push(item._data);
                _ret.update.refs.push(item._ref)
                accum.push(item);
            }

            return accum;
        };

        /**
         * 
         * @param {*} accum 
         * @param {*} item 
         * @returns 
         */
        var pushInsert = (accum, item) => {
            if (item._ref && !exisitingRefs.includes(item._ref)) {
                tblData.push(item);
                accum.push(item);
            }
            _ret.insert.data.push(item._data || item);
            _ret.insert.refs.push(item._ref || null);
            return accum;
        };

        var taskHandler = Object.create({
            update: () => records.update.reduce(pushUpdate, []),
            delete: () => {
                records.delete.forEach(key => {
                    var index = exisitingRefs.indexOf(key);
                    if (index > -1) {
                        exisitingRefs.splice(index, 1);
                        var item = tblData.splice(index, 1);
                        _ret['delete'].data.push(item[0]);
                    }
                });
                _ret['delete'].refs = records.delete
                return records.delete;
            },
            insert: () => records.insert.reduce(pushInsert, []),
            insertReplace: () => records.insertReplace.reduce((accum, item) => {
                if (exisitingRefs.includes(item._ref))
                    accum = pushUpdate(accum, item);
                else
                    accum = pushInsert(accum, item);

                return accum;
            }, [])
        });

        return new Promise((resolve, reject) => {
            if (canUpdate && types.length) {
                for (var type of types) {
                    if (records[type] && records[type].length) {
                        var eventValue = taskHandler[type]();
                        privateApi.storageFacade.broadcast(db, type, [tbl, eventValue, false]);
                    }
                }
            }

            resolve(copy(_ret, true));
        });
    };

    /**
     * 
     * @param {*} dbName 
     * @param {*} options: {tbl, path, method}
     * @returns 
     */
    static buildHttpRequestOptions(dbName, reqOptions) {
        var options = {};
        var networkResolver = privateApi.getActiveDB(dbName).get(constants.RESOLVERS).networkResolver;
        // requestState can either be a STRING or OBJECT { URL:STRING, tbl:String, AUTH_TYPE:Boolean}
        var requestState = networkResolver.requestMapping.get(reqOptions.path, reqOptions.method);
        if (requestState) {
            var cToken = $cookie('X-CSRF-TOKEN');
            var tbl = reqOptions.tbl || requestState.tbl;
            var cache = reqOptions.cache || requestState.CACHE || null;
            if (isarray(tbl)) tbl = JSON.stringify(tbl);
            // configure request options
            options = Object({
                url: (reqOptions.URL || networkResolver.serviceHost || '') + requestState.URL,
                $appName: dbName,
                type: requestState.METHOD,
                dataType: 'json',
                contentType: 'application/json',
                headers: {
                    Authorization: "Bearer *",
                    'X-REQ-OPTS': Base64Fn.encode(
                        `${networkResolver.organisation}:${dbName}:${(tbl || '')}:${(Math.floor(+new Date / 1000) * 1000)}:${networkResolver.nonce}`
                    )
                },
                requestState: requestState,
                cache: cache,
                data: reqOptions.data
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
    static updateDB(name, tblName, updateFn, lastSynced) {
        var openedDb = privateApi.getActiveDB(name);
        //put the data to DB
        if (openedDb) {
            //update the table lastModified
            var table = privateApi.getTable(name, tblName);
            if (table) {
                var ret = {
                    lastModified: +new Date,
                    _hash: table._hash,
                    _previousHash: table._previousHash
                };

                if (isfunction(updateFn)) {
                    updateFn.apply(updateFn, [ret]);
                }

                privateApi.storageFacade.broadcast(name, DB_EVENT_NAMES.UPDATE_TABLE, [tblName, ret]);
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
    static updateDeletedRecord(ref, obj) {
        var checker = privateApi.storageFacade.get(privateApi.storeMapping.delRecordName);
        var resolvers = privateApi.getActiveDB(obj.db).get(constants.RESOLVERS);
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
            table: function () {
                delRecords[ref][obj.name] = obj._hash || GUID();
                if (delRecords['rename'][obj.name]) {
                    delete delRecords['rename'][obj.name];
                }
            },
            rename: function () {
                delRecords[ref][obj.oldName] = obj.newName;
            },
            database: function () {
                delRecords[ref][obj.db] = {
                    hash: obj._hash || GUID(),
                    time: +new Date
                };
            }
        };

        (refActions[ref] || function () { })();
        //extend the delete Object
        //with the current deleteResolver
        checker[obj.db] = delRecords;
        privateApi.storageFacade.set(privateApi.storeMapping.delRecordName, checker);
    }

    /**
     * @method ProcessRequest
     * @param {*} request
     * @param {*} resolvedTable 
     * @param {*} appName 
     */
    static processRequest(request, resolvedTable, appName, updateDB) {
        //perform JSON Task
        return privateApi.$http(request)
            .then(res => {
                if (resolvedTable) {
                    //empty our local recordResolver
                    privateApi.getActiveDB(appName)
                        .get(constants.RECORDRESOLVERS)
                        .isResolved(resolvedTable, res._hash);

                    // TODO: Check if we have to update during syncState
                    if (updateDB) {
                        // privateApi.updateDB(appName, resolvedTable);
                    }
                }

                return res;
            });
    }

    /**
     * 
     * @param {*} table 
     * @param {*} type 
     * @param {*} refs 
     */
    static rollBack(table, type, refs) {
        if (table && type && refs) {
            var resolvers = privateApi.getActiveDB(dbName).get(constants.RECORDRESOLVERS);
            resolvers.rollBack(table, type, refs);
        }
    }

    /**
     * 
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} type 
     * @param {*} data 
     * @returns 
     */
    static autoSync(appName, tbl, type, data) {
        var ignoreSync = privateApi.getConfigData('ignoreSync', appName);
        if (!inarray(tbl, (ignoreSync || []))) {
            var recordResolver = privateApi.getActiveDB(appName).get(constants.RECORDRESOLVERS);
            var handleResult = res => {
                recordResolver
                    .isResolved(tbl, res._hash)
                    .handleFailedRecords(tbl, (res && res.failed));
                return res;
            };
            
            //process the request
            //Synchronize PUT STATE
            if (!data && type) {
                var dataToSync = recordResolver.get(tbl);
                data = dataToSync.data;
            }

            // make sure there is data to push
            var haveDataToProcess = Object.keys(data).some(key => (data[key].length > 0));
            if (haveDataToProcess) {
                var requestParams = privateApi.buildHttpRequestOptions(appName, { tbl, path: '/database/push' });
                requestParams.data = data;
                return privateApi.$http(requestParams)
                    .then(handleResult, handleResult);
            }
        }

        return Promise.resolve({ message: 'Nothing to sync' });
    };

    /**
     * 
     * @param {*} options 
     */
    static $http = (function () {
        var interceptor = Object.create({
            resolveInterceptor: function (type, options) {
                if (_globalInterceptors.has(type)) {
                    _globalInterceptors.get(type).forEach(function (interceptor) {
                        interceptor(options);
                    });
                }
                return options;
            }
        });

        var $ajax = AjaxSetup(interceptor);
        var checkedUserDefined = false;
        var userDefinedAjax = null;
        return function (options) {
            // one time  check for user custom ajax
            if (!checkedUserDefined) {
                checkedUserDefined = true;
                userDefinedAjax = privateApi.getConfigData('$ajax', options.$appName);
            }

            // use userDefined Ajax if configured
            if (userDefinedAjax) {
                return userDefinedAjax(options);
            }

            return $ajax(options);
        };
    })();
}