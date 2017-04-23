//Sync Functionality
function jEliDBSynchronization(appName)
{
  var networkResolver = $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver;
      syncHelper.conflictLog = {};

  function setMessage(msg){
    syncHelper.setMessage(msg, networkResolver);
  }

  //@Function Name syncResourceToServer
  //@Objective : Update the server resource File

  function syncResourceToServer()
  {
    setMessage('Resource synchronization started');
    var _options = syncHelper.setRequestData(appName,'resource','','');
        _options.type = "PUT";

    return ajax(_options);

  }

  function commit()
  {
      setMessage('Commit State Started');
  }



  function printLog()
  {
    for(var log in networkResolver.logger)
    {
      console.log(networkResolver.logger[log]);
    }
  }


  /*
    @Function : deleteSyncState
    @param : deleteRecords Object
    @param : resourceManager : Object
  */

  function deleteSyncState(deleteRecords,serverResource){

    this.done = function(_task)
    {
      return function(res){
          //update the delRecords
        if(res.data.removed.length)
        {
          var _delRecordManager = getStorageItem($queryDB.$delRecordName);
              delete _delRecordManager[appName];
          //update the storage
          setStorageItem($queryDB.$delRecordName,_delRecordManager);
        }

        if(_task === 'Table'){
            new startSyncState(appName, serverResource).process();
        }else{
          syncHelper.finalizeProcess(networkResolver);
        }
      }
    };

    this.fail = function(res)
    {
      setMessage('Failed to synchronize, unabled to resolve with the server, please try again');
      syncHelper.killState(networkResolver);
    };


    this.process = function()
    {
      var api = 'dropTable',
          data = deleteRecords.table,
          message = 'Droping '+JSON.stringify(Object.keys(data))+' Tables from the server',
          _task = "Table";
      //check if database was remove from client
      if(deleteRecords.database[appName]){
        api = 'dropDataBase';
        data = deleteRecords.database;
        message = "Droping "+appName+" Application from the server";
        _task = "Application";
      }

      //set message to our console
      setMessage(message);

      var _options = syncHelper.setRequestData(appName,api,true),
            $defer = new $p();
           _options.data.remove = data;
           _options.type = "DELETE";

        //perform JSON Task
        ajax(_options)
        .then(this.done(_task),this.fail);
    }
  }

  // @Process Entity State FN
  function processEntity(handler)
  {
    setMessage('ProcessEntity State Started');
    if(handler)
    {
      networkResolver.handler = handler;
    }

    if(networkResolver.serviceHost)
    {
        if(networkResolver.dirtyCheker)
        {
          syncHelper.pullResource(appName)
          .then(function(response)
          {
             var resourceChecker = response.data;
              if(!resourceChecker.resource)
              {
                  //first time using jEliDB
                  setMessage('Server Resource was not found');
                  setMessage('Creating new resource on the server');
                  syncResourceToServer()
                  .then(function(resourceResponse)
                  {
                    var resState = resourceResponse.data.state;
                      if(resState)
                      {
                        //start sync state
                        setMessage('Resource synchronized successfully');
                        new startSyncState(appName, false).process();
                      }else
                      {
                        //failed to set resource
                        setMessage('Resource synchronization failed');
                        syncHelper.killState(networkResolver);
                      }
                  },function()
                  {
                    setMessage('Resource synchronization failed, please check your network');
                    syncHelper.killState(networkResolver);
                  });
              }else
              {
                var _delRecordManager = getStorageItem($queryDB.$delRecordName),
                    removedSyncState = null,
                    _pulledResource = resourceChecker.resource;

                if(_delRecordManager && _delRecordManager[appName]){
                  //start deleted Sync State
                  new deleteSyncState(_delRecordManager[appName],_pulledResource).process();
                }else{
                  //start sync state
                  new startSyncState(appName, _pulledResource).process();
                };
                
              }
          },function(err)
          {
            setMessage('Pull Request has failed, please check your network');
            setMessage(err.data.error.message);
            syncHelper.killState(networkResolver);
          });
        }
    }else{
      setMessage('Error processing commit state, either serviceHost was not defined');
      printLog();
    }
  }

  function configSync(config)
  {
      if(config)
      {
        networkResolver = extend({},networkResolver,config);
      }

      //check for production state
      if(!networkResolver.inProduction)
      {
          return ({
                    processEntity : processEntity
                });
      }else
      {
          return new clientService(appName);
      }
  }

  this.Entity = function(syncTables)
  {
    syncHelper.entity = ($isArray(syncTables)?syncTables : maskedEval(syncTables));
    //set Message for Entity
    return ({
      configSync : configSync
    });
  };

}