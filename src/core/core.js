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
        var defer = new _Promise();
        var jeliInstance = {};
        var eventRegistry = {
            onCreate: function(a, next) {
                next();
            },
            onUpgrade: function(a, next) {
                next();
            }
        };
        var version = parseInt(version || "1");
        var _defaultConfig = ({
            storage: 'memory',
            isClientMode: false,
            isLoginRequired: false,
            schemaPath: null,
            useFrontendOnlySchema: false,
            ignoreSync: false,
            organisation: "_",
            version: version,
            /**
             * introduced in version 2.0.0
             * it is advised to only use this in dev env and not in prod
             * versions should always be upgraded when schema changes to keep everything in sync
             */
            alwaysCheckSchema: false,
            /**
             * set to true to use socket.io for realtime data
             * this requires you to compile application with socket.io library
             */
            enableSocket: false
        });

        /**
         * Upgrade and onCreate Registery
         * @param {*} state 
         * @param {*} triggerState 
         */
        function onEventRegistry(state) {
            return function(fn) {
                /**
                 * register the event
                 */
                if ($isFunction(fn)) {
                    /**
                     * register the event
                     */
                    eventRegistry[state] = fn;
                }

                return promise;
            };
        }

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
                config = extend(true, _defaultConfig, config),
                inProduction = config.isClientMode || false,
                _activeDBApi;

            if (name) {
                //set the current active DB
                privateApi.setActiveDB(name)
                    .setStorage(name, config, onStorageOpen);

                function onStorageOpen() {
                    /**
                     * set isOpened flag to true
                     * so that debugging is not posible when in production
                     **/
                    _activeDBApi = privateApi.getActiveDB(name);
                    if (privateApi.isOpen(name)) {
                        if (!config.isLoginRequired) {
                            errorBuilder("The DB you re trying to access is already open, please close the DB and try again later");
                        }
                        // increment our instance
                        // usefull when closing DB
                        _activeDBApi.incrementInstance();
                    } else if (!_activeDBApi.get('instance')) {
                        //set production flag
                        //register our configuration
                        _activeDBApi
                            .set('instance', 1)
                            .get('resolvers')
                            .register(config)
                            .register('inProduction', inProduction)
                            .register('requestMapping', new RequestMapping(false, name))
                            .trigger(function() {
                                if (!config.disableApiLoading && config.serviceHost) {
                                    this.getResolvers('requestMapping').resolveCustomApis();
                                }
                            });
                    }
                    /**
                     * initialize the deleteManager
                     * check if DB exists in the delete storage
                     * @return {boolean} 
                     */
                    var deleteManagerInstance = _activeDBApi.get('resolvers').deleteManager(name).init();
                    /**
                     * Database is deleted
                     * initializeDeleteMode
                     */
                    if (deleteManagerInstance.isDeletedDataBase()) {
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

                    startDB();
                }
            } else {
                jeliInstance.message = "There was an error creating your DB, either DB name or version number is missing";
                jeliInstance.mode = "errorMode";
                jeliInstance.errorCode = 101;
                //reject the request
                defer.reject(jeliInstance);
            }

            // Start DB
            function startDB() {
                /**
                 * Create a new DB Event 
                 * DB will be updated with data
                 * Only if onUpgrade Function is initilaized
                 * set upgrade mode
                 **/
                var dbChecker = privateApi.get(name) || false;
                jeliInstance.result = new ApplicationInstance(name, version);
                var schemaManager = new SchemaManager(jeliInstance.result, version, dbChecker.version || 1, config.schemaPath);
                var serverSchemaLoader = new ServerSchemaLoader(name, version);

                /**
                 * dataBase exists
                 */
                if (dbChecker && dbChecker.version) {
                    initializeExistMode(dbChecker, serverSchemaLoader, schemaManager);
                } else {
                    initializeCreateNewMode(serverSchemaLoader, schemaManager);
                }
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
             * @param {*} dbChecker 
             * @param {*} serverSchemaLoader 
             * @param {*} schemaManager 
             */
            function initializeExistMode(dbChecker, serverSchemaLoader, schemaManager) {
                if (dbChecker && $isEqual(dbChecker.version, version)) {
                    //set exists mode
                    // validate versions
                    jeliInstance.message = name + " DB already exists with version no:(" + dbChecker.version;
                    jeliInstance.message += "), having " + Object.keys(dbChecker.tables).length + " tables";
                    jeliInstance.type = "existMode";

                    /**
                     * check for updated schema from FO service
                     */
                    if (config.useFrontendOnlySchema && config.alwaysCheckSchema) {
                        serverSchemaLoader.get()
                            .then(function() {
                                defer.resolve(jeliInstance);
                            });
                    } else {
                        defer.resolve(jeliInstance);
                    }
                } else {
                    //set Message
                    // DB is already created but versioning is different
                    jeliInstance.message = name + " DB was successfully upgraded to version(" + version + ")";
                    jeliInstance.type = "upgradeMode";
                    // update the version
                    dbChecker.version = version;
                    // save the version
                    _activeDBApi.get('_storage_').setItem('version', version);

                    /**
                     * trigger schema upgrade check
                     */
                    schemaManager.upgrade(function() {
                        /**
                         * trigger our create and update mode
                         */
                        eventRegistry.onUpgrade(jeliInstance, function() {
                            /**
                             * resolve our instance
                             */
                            defer.resolve(jeliInstance);
                        });
                    });
                }
            }

            /**
             * 
             * @param {*} serverSchemaLoader 
             * @param {*} schemaManager 
             */
            function initializeCreateNewMode(serverSchemaLoader, schemaManager) {
                /**
                 * create our database instance
                 */
                jeliInstance.type = "createMode";
                //set Message
                jeliInstance.message = name + " DB was successfully created!!";

                function next() {
                    /**
                     * register next method to be triggered
                     */
                    eventRegistry.onCreate(jeliInstance, function() {
                        defer.resolve(jeliInstance);
                    });
                }

                /**
                 * start schema loading
                 * trigger our create and update mode
                 */
                if (config.useFrontendOnlySchema) {
                    serverSchemaLoader.get()
                        .then(next, function(response) {
                            defer.reject(response);
                        });
                } else {
                    schemaManager.create(next, function() {
                        _activeDBApi.get('resourceManager').setResource(getDBSetUp(name));
                        // store the DB version
                        privateApi.storageEventHandler.broadcast(eventNamingIndex(name, 'onResolveSchema'), [version, {}]);
                    });
                }
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

            //set upgradeneed to the promise Fn
            promise.onUpgrade = onEventRegistry('onUpgrade');

            /**
             * onCreate Promise
             */
            promise.onCreate = onEventRegistry('onCreate');

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