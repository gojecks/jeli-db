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
        applicationInstance = {},
        version = parseInt(version || "1"),
        _onUpgrade = function() {},
        _defaultConfig = {
            isClientMode: false,
            isLoginRequired: false
        };
    /**
     * 
     * @param {*} config 
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
                            .register('requestMapping', new RequestMapping(inProduction, name))
                            .trigger(function() {
                                this.getResolvers('requestMapping').resolveCustomApis();
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

                    if (!privateApi.$taskPerformer.initializeDB(name) && config.serviceHost) {
                        initializeDBSuccess();
                    } else {
                        startDB();
                    }
                });

            // Start DB
            function startDB() {
                applicationInstance.result = new ApplicationInstance(name, version);
                var dbChecker = privateApi.$get(name) || false,
                    isSameVersion = $isEqual(dbChecker.version, version);

                if (dbChecker && isSameVersion) {
                    applicationInstance.message = name + " DB already exists with version no:(" + dbChecker.version;
                    applicationInstance.message += "), having " + Object.keys(dbChecker.tables).length + " tables";

                    //set exists mode
                    applicationInstance.type = "existMode";

                } else {
                    /**
                     * Create a new DB Event 
                     * DB will be updated with data
                     * Only if onUpgrade Function is initilaized
                     * set upgrade mode
                     **/
                    applicationInstance.type = "upgradeMode";
                    privateApi.$set(name, { tables: {}, 'version': version });
                    // DB is already created but versioning is different
                    if (dbChecker && !isSameVersion) {
                        //set Message
                        applicationInstance.message = name + " DB was successfully upgraded!!";
                        privateApi[name].version = version;
                    } else {
                        //set Message
                        applicationInstance.message = name + " DB was successfully created!!";
                    }

                    // Object Store in Db
                    jEliUpdateStorage(name);

                    // trigger the onUpgrade Fn
                    _onUpgrade();
                }
                //resolve the request
                defer.resolve(applicationInstance);
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
                            loadSchema(tableNames);

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
            applicationInstance.message = "There was an error creating your DB,";
            applicationInstance.message += " either DB name or version number is missing";
            applicationInstance.mode = "errorMode";
            applicationInstance.errorCode = 101;

            //reject the request
            defer.reject(applicationInstance);
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
            applicationInstance.message = name + " database is deleted and pending sync, to re-initialize this Database please clean-up storage.";
            applicationInstance.mode = "deleteMode";
            applicationInstance.result = new ApplicationInstance(name, version, ["name", "version", "jQl", "synchronize", "info", "close"]);
            defer.reject(ApplicationInstance);
        }

        /**
         * 
         * @param {*} state 
         * @param {*} retryFN 
         */
        function handleNetworkError(state, msg, retryFN) {
            applicationInstance.mode = "AJAXErrorMode";
            applicationInstance.message = "[AJAXErrorMode]: " + msg;
            applicationInstance.result = new ApplicationInstance(name, version, ["name", "version", "jQl", "close"]);

            return function(res) {
                if (res && res.message) {
                    applicationInstance.message = applicationInstance.message + ", " + res.message
                }

                applicationInstance.netData = ({
                    status: res.status,
                    state: state,
                    $retry: retryFN
                });

                defer.reject(applicationInstance);
                applicationInstance = {};
            };
        }

        /**
         * 
         * @param {*} _loadServerData 
         */
        function loadSchema(_loadServerData) {
            syncHelper
                .getSchema(name, _loadServerData)
                .then(function(mergeResponse) {
                    //Create a new version of the DB
                    var dbTables = { tables: {}, 'version': version };
                    for (var tbl in mergeResponse.schemas) {
                        //set an empty data 
                        if (mergeResponse.schemas[tbl]) {
                            dbTables.tables[tbl] = mergeResponse.schemas[tbl];
                        }
                    }
                    //register DB to QueryDB
                    privateApi.$set(name, dbTables);
                    privateApi.storageEventHandler.broadcast(eventNamingIndex(name, 'onResolveSchema'), [Object.keys(dbTables.tables)]);
                    setStorageItem(name, dbTables);

                    //start the DB
                    startDB();
                }, handleNetworkError('schema', "Unable to load schema, please try again.", function() {
                    loadSchema(_loadServerData);
                }));
        }


        /**
         * @method startLoginMode
         * During this phase limited method are availabe to the Database instance
         * methods: _users(), close(), api()
         */
        function startLoginMode() {
            applicationInstance.result = new ApplicationInstance(name, version, ["_users", "name", "version", "close", "api"]);
            //set Login Mode
            applicationInstance.type = "loginMode";
            applicationInstance.message = "DB Authentication Mode!!";
            defer.resolve(applicationInstance);
        }

        //set upgradeneed to the promise Fn
        promise.onUpgrade = function(fn) {
            /**
             * set the promise callback for upgradeneeded
             **/
            promise.then(function() {
                if ($isFunction(fn) && $isEqual(applicationInstance.type, 'upgradeMode')) {
                    if (applicationInstance) {
                        //initialize the upgraded FN
                        fn.call(fn, applicationInstance);
                    }
                }
            });

            return this;
        };

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

//prototype for jEli Plugin
var customPlugins = new watchBinding(); //used to hold customPlugins
jEliDB.plugins = Object.create({
    jQl: function(name, plugin) {
        if (name && $isObject(plugin) && !customPlugins.hasProp(name)) {
            customPlugins.$new(name, plugin);
        } else {
            errorBuilder('Failed to register plugin, either it already exists or invalid definition');
        }
    },
    disablePlugins: function(list) {
        if ($isArray(list)) {
            list.forEach(disable);
            return;
        }

        disable(list);

        function disable(_plugin) {
            if (customPlugins.hasProp(_plugin)) {
                customPlugins.$get(_plugin).disabled = true;
            }
        }
    },
    enablePlugins: function(list) {
        if ($isArray(list)) {
            list.forEach(enable);
            return;
        }

        enable(list);

        function enable(_plugin) {
            if (customPlugins.hasProp(_plugin)) {
                customPlugins.$get(_plugin).disabled = false;
            }
        }
    }
});

window.jdb = jEliDB;