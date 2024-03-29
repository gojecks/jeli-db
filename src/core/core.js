/**
 * @method Database
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
function Database(name, version) {
    var jeliInstance = {};
    var version = parseInt(version || "1");
    var inProduction = false;
    var _activeDBApi = null;
    var requestMapping = null;
    var dbConfig = Object({
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
        enableSocket: false,
        /**
         * wait for api to load before starting DB
         */
        waitApiToLoad: true
    });

    var dbPromiseExtension = new DBPromise.extension(
        /**
         * Upgrade and onCreate Registery
         * @param {*} state 
         * @param {*} triggerState 
         */
        function (_, next) {
            next();
        }, ['onUpgrade', 'onCreate']);

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
    function open(userConfig) {
        dbConfig = extend(true, dbConfig, userConfig);
        inProduction = dbConfig.isClientMode || false;
        return new DBPromise(function (resolve, reject) {
            if (name) {
                //set the current active DB
                privateApi
                    .setActiveDB(name)
                    .setStorage(name, dbConfig, () => onOpenDataBase(resolve, reject));
            } else {
                jeliInstance.message = "There was an error creating your DB, either DB name or version number is missing";
                jeliInstance.mode = "errorMode";
                jeliInstance.errorCode = 101;
                //reject the request
                reject(jeliInstance);
            }
        }, dbPromiseExtension.handlers);
    }

    /**
     * 
     * @param {*} resolve 
     * @param {*} reject 
     * @returns 
     */
    function onOpenDataBase(resolve, reject) {
        var continueProcess = function () { return startDB(resolve, reject) };
        /**
         * set isOpened flag to true
         * so that debugging is not posible when in production
         **/
        _activeDBApi = privateApi.getActiveDB(name);
        if (privateApi.isOpen(name)) {
            if (!dbConfig.isLoginRequired) {
                errorBuilder("The DB you re trying to access is already open, please close the DB and try again later");
            }
            // increment our instance
            // usefull when closing DB
            _activeDBApi.incrementInstance();
        } else if (!_activeDBApi.instance) {
            //set production flag
            //register our configuration
            requestMapping = new RequestMapping(name);
            _activeDBApi
                .incrementInstance()
                .get(constants.RESOLVERS)
                .register(dbConfig)
                .register('inProduction', inProduction)
                .register('requestMapping', requestMapping);
        }
        /**
         * initialize the deleteManager
         * check if DB exists in the delete storage
         * @return {boolean} 
         */
        var deleteManagerInstance = _activeDBApi.get(constants.RESOLVERS).deleteManager(name).init();
        /**
         * Database is deleted
         * initializeDeleteMode
         */
        if (deleteManagerInstance.isDeletedDataBase()) {
            jeliInstance.message = name + " database is deleted and pending sync, to re-initialize this Database please clean-up storage.";
            jeliInstance.mode = "deleteMode";
            jeliInstance.result = new DatabaseDeletedInstance(name, version);
            return reject(jeliInstance);
        }

        /**
         * This is useful when client trys to login in user before loading the DB
         * 
         * */
        if (dbConfig.isLoginRequired) {
            /**
             * @method startLoginMode
             * During this phase limited method are availabe to the Database instance
             * methods: _users(), close(), api()
             */
            jeliInstance.result = new DatabaseLoginInstance(name, version);
            //set Login Mode
            jeliInstance.type = "loginMode";
            jeliInstance.message = "DB Authentication Mode!!";
            return resolve(jeliInstance);
        }

        /**
         * load api before continue process
         */
        if (!dbConfig.disableApiLoading && dbConfig.serviceHost && requestMapping) {
            var apiMappingRequest = requestMapping.resolveCustomApis();
            if (dbConfig.waitApiToLoad) {
                apiMappingRequest.then(continueProcess, continueProcess);
            } else {
                continueProcess();
            }
            requestMapping = apiMappingRequest = null;
        } else {
            continueProcess();
        }
    }



    // Start DB
    function startDB(resolve, reject) {
        /**
         * Create a new DB Event 
         * DB will be updated with data
         * Only if onUpgrade Function is initilaized
         * set upgrade mode
         **/
        var dbChecker = privateApi.get(name) || false;
        jeliInstance.result = new DatabaseInstance(name, version);
        var schemaManager = new SchemaManager(jeliInstance.result, version, dbChecker.version || 1, dbConfig.schemaPath);
        var serverSchemaLoader = ServerSchemaLoader(name, version);

        /**
         * dataBase exists
         */
        if (dbChecker && dbChecker.version) {
            initializeExistMode();
        } else {
            initializeCreateNewMode();
        }


        function initializeExistMode() {
            if (dbChecker && isequal(dbChecker.version, version)) {
                //set exists mode
                // validate versions
                jeliInstance.message = name + " DB already exists with version no:(" + dbChecker.version;
                jeliInstance.message += "), having " + Object.keys(dbChecker.tables).length + " tables";
                jeliInstance.type = "existMode";

                /**
                 * check for updated schema from FO service
                 */
                if (dbConfig.useFrontendOnlySchema && dbConfig.alwaysCheckSchema) {
                    serverSchemaLoader(false)
                        .then(function () {
                            resolve(jeliInstance);
                        }, reject);
                } else {
                    resolve(jeliInstance);
                }
            } else {
                //set Message
                // DB is already created but versioning is different
                jeliInstance.message = name + " DB was successfully upgraded to version(" + version + ")";
                jeliInstance.type = "upgradeMode";
                // update the version
                dbChecker.version = version;
                // save the version
                _activeDBApi.get(constants.STORAGE).setItem('version', version);
                /**
                 * trigger schema upgrade check
                 */
                schemaManager.upgrade(function () {
                    /**
                     * trigger our create and update mode
                     */
                    dbPromiseExtension.call('onUpgrade', [jeliInstance, function () {
                        /**
                         * resolve our instance
                         */
                        resolve(jeliInstance);
                    }]);
                });
            }
        }


        function initializeCreateNewMode() {
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
                dbPromiseExtension.call('onCreate', [jeliInstance, function () {
                    resolve(jeliInstance);
                }]);
            }

            /**
             * start schema loading
             * trigger our create and update mode
             */
            if (dbConfig.useFrontendOnlySchema) {
                serverSchemaLoader(true).then(next, reject);
            } else {
                schemaManager.create(next, function () {
                    _activeDBApi.get(constants.RESOURCEMANAGER).setResource({
                        started: +new Date,
                        lastUpdated: +new Date,
                        resourceManager: {},
                        lastSyncedDate: null
                    });
                    // store the DB version
                    privateApi.storageFacade.broadcast(name, DB_EVENT_NAMES.RESOLVE_SCHEMA, [version, {}]);
                });
            }
        }
    }


    /**
     * Don't call this function except you re in procution
     **/
    function isClient() {
        //set inproduction to true
        dbConfig.isClientMode = true;
        return ({
            open: open,
            requiresLogin: requiresLogin
        });
    }

    function requiresLogin() {
        dbConfig.isLoginRequired = true;
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

/**
 * register global AJAX interceptor to JDB plugins
 */
Database.registerGlobalInterceptor = function (type, fn) {
    if (!_globalInterceptors.has(type)) {
        _globalInterceptors.set(type, []);
    }

    _globalInterceptors.get(type).push(fn);

    return this;
};

Database.plugins = new PluginsInstance();
Database.storageAdapter = new StorageAdapter();
Database.connectors =  new ConnectorAdapter();