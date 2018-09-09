/**
 * 
 * @param {*} name 
 * @param {*} version 
 */
function jEliDB(name, version) {
    var defer = new $p(),
        dbEvent = {},
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
            $queryDB.$setActiveDB(name)
                // set the storage type
                .setStorage(config, function() {
                    //set isOpened flag to true
                    //so that debug is not posible when in production
                    if ($queryDB.isOpen(name)) {
                        if (!config.isLoginRequired) {
                            errorBuilder("The DB you re trying to access is already open, please close the DB and try again later");
                        }
                    }


                    //set production flag
                    //register our configuration
                    _activeDBApi = $queryDB.$getActiveDB(name);
                    var isDeletedDB = _activeDBApi
                        .$get('resolvers')
                        .register(config)
                        .register('inProduction', inProduction)
                        .register('requestMapping', new RequestMapping(inProduction, name))
                        .trigger(function() {
                            this.getResolvers('requestMapping').resolveCustomApis();
                        })
                        /**
                         * initialize the deleteManager
                         * check if DB exists in the delete storage
                         * @return {boolean} 
                         */
                        .deleteManager(name)
                        .init()
                        .isDeletedDataBase();

                    if (isDeletedDB) {
                        initializeDeleteMode();
                        return promise;
                    }

                    //This is useful when client trys to login in user before loading the DB
                    if (config.isLoginRequired) {
                        startLoginMode();
                        return promise;
                    }

                    if (!$queryDB.$taskPerformer.initializeDB(name) && config.serviceHost) {
                        initializeDBSuccess();
                    } else {
                        startDB();
                    }

                });

            // Start DB
            function startDB() {
                dbEvent.result = new DBEvent(name, version);
                var dbChecker = $queryDB.$get(name) || false,
                    isSameVersion = $isEqual(dbChecker.version, version);

                if (dbChecker && isSameVersion) {
                    dbEvent.message = name + " DB already exists with version no:(" + dbChecker.version;
                    dbEvent.message += "), having " + Object.keys(dbChecker.tables).length + " tables";

                    //set exists mode
                    dbEvent.type = "existMode";

                } else {
                    //Create a new DB Event 
                    //DB will be updated with data
                    //Only if onUpgrade Function is initilaized

                    //set upgrade mode
                    dbEvent.type = "upgradeMode";
                    $queryDB.$set(name, { tables: {}, 'version': version });
                    // DB is already created but versioning is different
                    if (dbChecker && !isSameVersion) {
                        //set Message
                        dbEvent.message = name + " DB was successfully upgraded!!";
                        $queryDB[name].version = version;
                    } else {
                        //set Message
                        dbEvent.message = name + " DB was successfully created!!";
                    }

                    // Object Store in Db
                    jEliUpdateStorage(name);

                    // trigger the onUpgrade Fn
                    _onUpgrade();
                }
                //resolve the request
                defer.resolve(dbEvent);
            }

            function initializeDBSuccess() {
                //synchronize the server DB
                syncHelper
                    .pullResource(name)
                    .then(function(syncResponse) {
                        if (syncResponse.data.resource) {
                            var tableNames = _activeDBApi.$get('resourceManager')
                                .setResource(syncResponse.data.resource)
                                .getTableNames();
                            //Get the DB schema 
                            //for each Table
                            loadSchema(tableNames);

                        } else {
                            if (inProduction) {
                                errorBuilder("Unable to initialize DB please contact the Web Admin");
                            }
                            //no resource found on the server
                            handleFailedSync();
                        }
                    }, handleNetworkError('resource', "Failed to initialize DB", initializeDBSuccess));
            }

        } else {
            dbEvent.message = "There was an error creating your DB,";
            dbEvent.message += " either DB name or version number is missing";
            dbEvent.mode = "errorMode";
            dbEvent.errorCode = 101;

            //reject the request
            defer.reject(dbEvent);
        }

        //No resource found or error from server
        function handleFailedSync() {
            _activeDBApi.$get('resourceManager').setResource(getDBSetUp(name));
            startDB();
        }

        /**
         * Function to handle deleted Database
         */
        function initializeDeleteMode() {
            dbEvent.message = name + " database is deleted and pending sync, to re-initialize this Database please clean-up storage.";
            dbEvent.mode = "deleteMode";
            dbEvent.result = new DBEvent(name, version, ["name", "version", "jQl", "synchronize", "info", "close"]);
            defer.reject(dbEvent);
        }

        /**
         * 
         * @param {*} state 
         * @param {*} retryFN 
         */
        function handleNetworkError(state, msg, retryFN) {
            dbEvent.mode = "AJAXErrorMode";
            dbEvent.message = "[AJAXErrorMode]: " + msg;
            dbEvent.result = new DBEvent(name, version, ["name", "version", "jQl", "close"]);

            return function(res) {
                if (res.data && res.data.message) {
                    dbEvent.message = dbEvent.message + ", " + res.data.message
                }

                dbEvent.netData = ({
                    status: res.status,
                    state: state,
                    $retry: retryFN
                });

                defer.reject(dbEvent);
                dbEvent = {};
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
                    $queryDB.$set(name, dbTables);
                    $queryDB.storageEventHandler.broadcast(eventNamingIndex(name, 'onResolveSchema'), [Object.keys(dbTables.tables)]);
                    setStorageItem(name, dbTables);

                    //start the DB
                    startDB();
                }, handleNetworkError('schema', "Unable to load schema", function() {
                    loadSchema(_loadServerData);
                }));
        }


        //LoginModeInitializer
        function startLoginMode() {
            dbEvent.result = new DBEvent(name, version, ["_users", "name", "version", "close", "api"]);
            //set Login Mode
            dbEvent.type = "loginMode";
            dbEvent.message = "DB Authentication Mode!!";
            defer.resolve(dbEvent);
        }

        //set upgradeneed to the promise Fn
        promise.onUpgrade = function(fn) {
            /***
                set the promise callback for upgradeneeded
            ***/
            promise.then(function() {
                if ($isFunction(fn) && $isEqual(dbEvent.type, 'upgradeMode')) {
                    if (dbEvent) {
                        //initialize the upgraded FN
                        fn.call(fn, dbEvent);
                    }
                }
            });

            return this;
        };

        return promise;
    }


    //Don't call this function except you re in procution
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