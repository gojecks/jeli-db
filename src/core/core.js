
var customPlugins = new watchBinding(); //used to hold customPlugins
function jEliDB(name,version)
{

  var defer = new $p(),
      dbEvent = {},
      version = parseInt(version || "1"),
      _onUpgrade = function(){},
      loginRequired = false,
      _isClient = false;
  //set the Database name
  function open(config)
  {
    var promise = new DBPromise(defer),
        inProduction;
    
    if(name)
    {
        //set the current active DB
      $queryDB.$setActiveDB(name);
      // set the storage type
      $queryDB.setStorage(config, function(){
          //set isOpened flag to true
          //so that debug is not posible when in production
          if($queryDB.isOpen(name)){
            if(!loginRequired  && !config.isLoginRequired){
              errorBuilder("The DB you re trying to access is already open, please close the DB and try again later");
            }
          }
          

          //set production flag
          //register our configuration
          $queryDB.$getActiveDB().$get('resolvers').register(config);
          $queryDB.$getActiveDB().$get('resolvers').register('inProduction', _isClient || config.isClientMode || false);
          inProduction = _isClient || config.isClientMode;

          //This is useful when client trys to login in user before loading the DB
          if(loginRequired || config.isLoginRequired){
            startLoginMode();
            return promise;
          }

          if(!$queryDB.$taskPerformer.initializeDB(name) && config.serviceHost){
            initializeDBSuccess();
          }else{
            startDB();
          }

      });
      
      //No resource found or error from server
        function handleFailedSync()
        {
          $queryDB.$getActiveDB(name).$get('resourceManager').setResource(getDBSetUp(name));
          startDB();
        }


        //LoginModeInitializer
        function startLoginMode(){
          dbEvent.result = new DBEvent(name,version,["_users","name","version","close","api"]);
          //set Login Mode
          dbEvent.type = "loginMode";
          dbEvent.message = "DB Authentication Mode!!";
          defer.resolve(dbEvent);
        }

      // Start DB
        function startDB()
        {
            dbEvent.result = new DBEvent(name,version);
            var dbChecker = $queryDB.$get(name) || false,
                isSameVersion = $isEqual(dbChecker.version, version);

            if(dbChecker && isSameVersion)
            {
              dbEvent.message = name+" DB already exists with version no:("+dbChecker.version;
              dbEvent.message +="), having "+Object.keys(dbChecker.tables).length+" tables";

              //set exists mode
              dbEvent.type = "existMode";

            }
            else
            {
              //Create a new DB Event 
              //DB will be updated with data
              //Only if onUpgrade Function is initilaized

              //set upgrade mode
              dbEvent.type = "upgradeMode";
              $queryDB.$set(name,{tables : {},'version':version});
              // DB is already created but versioning is different
              if(dbChecker && !isSameVersion)
              {
                  //set Message
                  dbEvent.message = name+" DB was successfully upgraded!!";
                  $queryDB[name].version = version;
              }else
              {
                //set Message
                  dbEvent.message = name+" DB was successfully created!!";
              }

              // Object Store in Db
              jEliUpdateStorage(name);

              // trigger the onUpgrade Fn
              _onUpgrade();
            }
            //resolve the request
            defer.resolve(dbEvent);
        }

        function initializeDBSuccess(){
          //synchronize the server DB
            syncHelper
            .pullResource(name)
            .then(function(syncResponse)
            {
                if(syncResponse.data.resource)
                {
                    var resource = syncResponse.data.resource,
                        _resource = $queryDB.$getActiveDB(),
                        _loadServerData = _resource.$get('resolvers').getResolvers('loadServerData') || [];
                      _resource.$get('resourceManager').setResource(resource);
                    //Get the DB schema 
                    //for each Table
                    syncHelper
                    .getSchema(name, _loadServerData)
                    .then(function(mergeResponse)
                    {
                      //Create a new version of the DB
                        var dbTables = {tables : {},'version':version};

                            for(var tbl in mergeResponse.schemas)
                            {
                              //set an empty data 
                              dbTables.tables[tbl] = mergeResponse.schemas[tbl];
                            }

                        //register DB to QueryDB
                        $queryDB.$set(name, dbTables );
                        $queryDB.storageEventHandler.broadcast(eventNamingIndex(name,'onResolveSchema'), [Object.keys(dbTables.tables)]);
                        setStorageItem(name, dbTables );


                        //start the DB
                        startDB();
                    });

                }else
                {
                  if(inProduction){
                    errorBuilder("Unable to initialize DB please contact the Web Admin");
                  }
                  //no resource found on the server
                  handleFailedSync();
                }
            },function()
            {
                //failed to get resource
                handleFailedSync();
            });
        }      
        
    }
    else
    {
        dbEvent.message = "There was an error creating your DB,";
        dbEvent.message +=" either DB name or version number is missing";
        dbEvent.errorCode = 101;

        //reject the request
        defer.reject(dbEvent);
    }

        //set upgradeneed to the promise Fn
        promise.onUpgrade = function(fn)
        {
          /***
              set the promise callback for upgradeneeded
          ***/
          promise.then(function(){
            if($isFunction(fn) && $isEqual(dbEvent.type,'upgradeMode'))
            {
              if(dbEvent)
              {
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
  function isClient()
  {
    //set inproduction to true
    _isClient = true;
    return ({
      open : open,
      requiresLogin: requiresLogin
    });
  }

  function requiresLogin(){
    loginRequired = true;
    return ({
      open:open
    });
  }
 


    //return a promise
    return ({
        open : open,
        isClientMode : isClient,
        requiresLogin: requiresLogin
    });
}

//prototype for jEli Plugin
  jEliDB.plugins = ({
      jQl : function(name,plugin){
        if(name && $isObject(plugin)){
          customPlugins.$new(name,plugin);
        }
    }
  });
