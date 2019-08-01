    /**
     * @method jEliDB
     * @param {*} name 
     * @param {*} version 
     * 
     * This is the core Method that create the database instance
     * private methods includes
     * requiresLogin()
     * isClientMode()
     * open() : promise
     * 
     * @return instance
     */
    function jEliDB(name, version) {
        var defer = new _Promise(),
            jeliInstance = {},
            eventRegistry = {
                onCreate: function(a, next) {
                    next();
                },
                onUpgrade: function(a, next) {
                    next();
                }
            },
            version = parseInt(version || "1"),
            _defaultConfig = {
                isClientMode: false,
                isLoginRequired: false
            };
        /**
         * 
         * @param {*} config 
         * {
         *  disableApiLoading: false
         *  isClientMode: false,
         *  isLoginRequired: false
         *  serviceHost: ""
         *  live: false
         *  
         * }
         */
        function open(config) {
            var promise = new DBPromise(defer),
                config = extend({}, _defaultConfig, config),
                inProduction = config.isClientMode || false,
                _activeDBApi;

            if (name) {
                //set the current active DB
                privateApi.$setActiveDB(name)
                    // set the storage type
                    .setStorage(name, config, function() {
                        /**
                         * set isOpened flag to true
                         * so that debugging is not posible when in production
                         **/
                        _activeDBApi = privateApi.$getActiveDB(name);
                        if (privateApi.isOpen(name)) {
                            if (!config.isLoginRequired) {
                                errorBuilder("The DB you re trying to access is already open, please close the DB and try again later");
                            }
                            // increment our instance
                            // usefull when closing DB
                            _activeDBApi.$incrementInstance();
                        } else if (!_activeDBApi.$get('instance')) {
                            //set production flag
                            //register our configuration
                            _activeDBApi
                                .$set('instance', 1)
                                .$get('resolvers')
                                .register(config)
                                .register('inProduction', inProduction)
                                .register('requestMapping', new RequestMapping(false, name))
                                .trigger(function() {
                                    if (!config.disableApiLoading && config.serviceHost) {
                                        this.getResolvers('requestMapping').resolveCustomApis();
                                    }
                                });
                        }

                        var isDeletedDB = _activeDBApi.$get('resolvers')
                            /**
                             * initialize the deleteManager
                             * check if DB exists in the delete storage
                             * @return {boolean} 
                             */
                            .deleteManager(name)
                            .init()
                            .isDeletedDataBase();
                        /**
                         * Database is deleted
                         * initializeDeleteMode
                         */
                        if (isDeletedDB) {
                            initializeDeleteMode();
                            return promise;
                        }

                        /**
                         * This is useful when client trys to login in user before loading the DB
                         * 
                         * */
                        if (config.isLoginRequired) {
                            startLoginMode();
                            return promise;
                        }

                        if (!_activeDBApi.$get('resourceManager').$isExists() && config.serviceHost) {
                            initializeDBSuccess();
                        } else {
                            startDB();
                        }
                    });

                // Start DB
                function startDB() {
                    /**
                     * Create a new DB Event 
                     * DB will be updated with data
                     * Only if onUpgrade Function is initilaized
                     * set upgrade mode
                     **/
                    jeliInstance.result = new ApplicationInstance(name, version);
                    var dbChecker = privateApi.$get(name) || false,
                        isSameVersion = dbChecker && $isEqual(dbChecker.version, version);
                    /**
                     * dataBase exists
                     */
                    if (dbChecker && dbChecker.version) {
                        if (isSameVersion) {
                            //set exists mode
                            // validate versions
                            jeliInstance.message = name + " DB already exists with version no:(" + dbChecker.version;
                            jeliInstance.message += "), having " + Object.keys(dbChecker.tables).length + " tables";
                            jeliInstance.type = "existMode";
                            defer.resolve(jeliInstance);
                        } else {
                            //set Message
                            // DB is already created but versioning is different
                            jeliInstance.message = name + " DB was successfully upgraded to version(" + version + ")";
                            jeliInstance.type = "upgradeMode";
                            // update the version
                            dbChecker.version = version;
                            // save the version
                            _activeDBApi.$get('_storage_').setItem('version', version);

                            /**
                             * trigger our create and update mode
                             */
                            eventRegistry.onUpgrade(function() {
                                /**
                                 * resolve our instance
                                 */
                                defer.resolve(jeliInstance);
                            });
                        }
                    } else {
                        _activeDBApi
                            .$get('resourceManager')
                            .setResource(getDBSetUp(name));
                        /**
                         * create our database instance
                         */
                        jeliInstance.type = "createMode";
                        //set Message
                        jeliInstance.message = name + " DB was successfully created!!";

                        /**
                         * trigger our create and update mode
                         */
                        eventRegistry.onCreate(function() {
                            /**
                             * register next method to be triggered
                             */
                            eventRegistry.onUpgrade(function() {
                                /**
                                 * resolve our instance
                                 */
                                defer.resolve(jeliInstance);
                            });
                        });

                        // Object Store in Db
                        privateApi.storageEventHandler.broadcast(eventNamingIndex(name, 'onResolveSchema'), [version, {}]);
                    }
                }

                /**
                 * @method initializeDBSuccess
                 * This method loads Database resource and schema from storage
                 * before intializing the Database
                 */
                function initializeDBSuccess() {
                    //synchronize the server DB
                    syncHelper
                        .pullResource(name)
                        .then(function(syncResponse) {
                            if (syncResponse.resource) {
                                var tableNames = _activeDBApi.$get('resourceManager')
                                    .setResource(syncResponse.resource)
                                    .getTableNames();
                                //Get the DB schema 
                                //for each Table
                                loadSchema(tableNames, syncResponse.resource.resourceManager);

                            } else {
                                if (inProduction) {
                                    errorBuilder("Unable to initialize DB please contact the Admin");
                                }
                                //no resource found on the server
                                handleFailedSync();
                            }
                        }, handleNetworkError('resource', "Failed to initialize DB", initializeDBSuccess));
                }

            } else {
                jeliInstance.message = "There was an error creating your DB,";
                jeliInstance.message += " either DB name or version number is missing";
                jeliInstance.mode = "errorMode";
                jeliInstance.errorCode = 101;

                //reject the request
                defer.reject(jeliInstance);
            }

            //No resource found or error from server
            function handleFailedSync() {
                _activeDBApi.$get('resourceManager')
                    .setResource(getDBSetUp(name));
                startDB();
            }

            /**
             * Function to handle deleted Database
             */
            function initializeDeleteMode() {
                jeliInstance.message = name + " database is deleted and pending sync, to re-initialize this Database please clean-up storage.";
                jeliInstance.mode = "deleteMode";
                jeliInstance.result = new ApplicationInstance(name, version, ["name", "version", "jQl", "synchronize", "info", "close"]);
                defer.reject(jeliInstance);
            }

            /**
             * 
             * @param {*} state 
             * @param {*} retryFN 
             */
            function handleNetworkError(state, msg, retryFN) {
                jeliInstance.mode = "AJAXErrorMode";
                jeliInstance.message = "[AJAXErrorMode]: " + msg;
                jeliInstance.result = new ApplicationInstance(name, version, ["name", "version", "jQl", "close"]);

                return function(res) {
                    if (res && res.message) {
                        jeliInstance.message = jeliInstance.message + ", " + res.message
                    }

                    jeliInstance.netData = ({
                        status: res.status,
                        state: state,
                        $retry: retryFN
                    });

                    defer.reject(jeliInstance);
                    jeliInstance = {};
                };
            }

            /**
             * 
             * @param {*} _loadServerData 
             */
            function loadSchema(_loadServerData, dbResource) {
                syncHelper
                    .getSchema(name, _loadServerData)
                    .then(function(mergeResponse) {
                        //Create a new version of the DB
                        var dbTables = {};
                        for (var tbl in mergeResponse.schemas) {
                            //set an empty data 
                            if (mergeResponse.schemas[tbl]) {
                                dbTables[tbl] = extend(mergeResponse.schemas[tbl], dbResource[tbl]);
                            }
                        }
                        //register DB to QueryDB
                        privateApi.storageEventHandler.broadcast(eventNamingIndex(name, 'onResolveSchema'), [version, dbTables]);
                        //start the DB
                        startDB();
                    }, handleNetworkError('schema', "Unable to load schema, please try again.", function() {
                        // reload the schema when network is stable
                        loadSchema(_loadServerData, dbResource);
                    }));
            }


            /**
             * @method startLoginMode
             * During this phase limited method are availabe to the Database instance
             * methods: _users(), close(), api()
             */
            function startLoginMode() {
                jeliInstance.result = new ApplicationInstance(name, version, ["_users", "name", "version", "close", "api"]);
                //set Login Mode
                jeliInstance.type = "loginMode";
                jeliInstance.message = "DB Authentication Mode!!";
                defer.resolve(jeliInstance);
            }

            /**
             * Upgrade and onCreate Registery
             */
            function onEventRegistry(state, triggerState) {
                return function(fn) {
                    /**
                     * register the event
                     */
                    if ($isFunction(fn)) {
                        /**
                         * register the event
                         */
                        eventRegistry[state] = function(next) {
                            if (jeliInstance && $inArray(jeliInstance.type, triggerState)) {
                                fn.call(fn, jeliInstance, next);
                            }
                        }
                    }

                    return promise;
                };
            }

            //set upgradeneed to the promise Fn
            promise.onUpgrade = onEventRegistry('onUpgrade', ['upgradeMode', 'createMode']);

            /**
             * onCreate Promise
             */
            promise.onCreate = onEventRegistry('onCreate', ['createMode']);

            return promise;
        }


        /**
         * Don't call this function except you re in procution
         **/
        function isClient() {
            //set inproduction to true
            _defaultConfig.isClientMode = true;
            return ({
                open: open,
                requiresLogin: requiresLogin
            });
        }

        function requiresLogin() {
            _defaultConfig.isLoginRequired = true;
            return ({
                open: open
            });
        }



        //return a promise
        return ({
            open: open,
            isClientMode: isClient,
            requiresLogin: requiresLogin
        });
    }