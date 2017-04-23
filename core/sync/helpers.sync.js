var syncHelper = {};
syncHelper.printConflictLog = function (networkResolver)
{
  for(var i in this.conflictLog)
  {
      setMessage('---Log for '+i+' table----', networkResolver);
      var cList = ["delete","insert","update"],
          cLog = ["data","columns"];
        for(var log in cLog)
        {
          setMessage(cLog[log].toUpperCase() +' Changes: '+this.conflictLog[i][cLog[log]].changesFound, networkResolver);
          for(var list in cList)
          {
            setMessage(cList[list].toUpperCase()+" : "+this.conflictLog[i][cLog[log]][cList[list]].length, networkResolver)
          }
        }
  }

};

//Sync Error Message Logger
syncHelper.setMessage = function(log, networkResolver)
{
  if(log)
  {
    log = '['+new Date().toLocaleString()+'] : '+ log;
    if(networkResolver.logService)
    {
        networkResolver.logService(log);
    }else
    {
      networkResolver.logger.push(log);
    }
  }
};

  //function fakeTable
syncHelper.createFakeTable = function()
{
  return ({
    $hash : null,
    data:[],
    columns : [{}]
  });
};

   //function to bypass undefined table in table set
syncHelper.setTable = function(tbl)
{
  return (!$isUndefined(tbl) && tbl || this.createFakeTable() );
};

syncHelper.setRequestData = function(appName, state, ignore, tbl)
{
  var options = $queryDB.buildOptions(appName,tbl,state);
  //ignore post data
  if(!ignore)
  {
    switch(state.toLowerCase())
    {
      case('push'):
      case('syncstate'):
        options.data.postData = $queryDB.$getTable(appName,tbl);
        options.data.action = "overwrite";
      break;
      case('resource'):
        var resources = $queryDB.$getActiveDB(appName).$get('resourceManager').getResource();
        options.data.postData = resources;
      break;
    }
  }

  return options;
};

 //@Fn Name prepareTables
  //@return ARRAY of tables
syncHelper.prepareSyncState = function(appName, resource)
{
  var tbls = [];
  // check if table was requested
  if($isArray(this.entity) || $isArray(resource)){
    tbls = this.entity || resource;
  }else{
     var localResource = getStorageItem(appName) || $queryDB.$getActiveDB(appName).$get('resourceManager').getResource();
      if(localResource.tables || localResource.resourceManager)
      {
        tbls = Object.keys(localResource.tables || localResource.resourceManager);
      }
  }

    return ({tables:tbls});
};

syncHelper.getSchema = function(appName, requiredData)
{
  var _options = this.setRequestData(appName, 'schema',false, this.prepareSyncState(appName).tables),
      $defer = new $p();
      //set request for Data
      _options.data.fetchData = requiredData;
      _options.type = "POST";

  ajax(_options)
    .then(function(res)
    {
      $defer.resolve(res.data);
    },function(res)
    {
      $defer.reject(res);;
    });

  return $defer;
};

//@Function pullResource
  //Pull Resource From the Server
syncHelper.pullResource = function(appName)
{
  return ajax(this.setRequestData(appName,'resource',true));
};


 //@Function Name KillState
syncHelper.killState = function(networkResolver)
{
  networkResolver.handler.onError(dbErrorPromiseObject("Completed with Errors, please check log"));
};

 //@FN NAME finalizeProcess();
syncHelper.finalizeProcess = function(networkResolver)
{
   networkResolver.handler.onSuccess(dbSuccessPromiseObject("sync",'Synchronization Complete without errors'));
};

//@Function Name Push
  //Objective : update the server database with client records
syncHelper.push = function(appName, tbl, data, state)
{
    syncHelper.setMessage('Initializing Push State for table('+tbl+')', $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver);
    //check state
    state = state || 'push';
    var _options = syncHelper.setRequestData(appName,state,false,tbl);
    //update the table and not overwrite
    if(data)
    {
      if(!data.columns.diff)
      {
        data.$hash = _options.data.postData.$hash; //update the postData hash before posting
        _options.data.postData = _recordResolvers.$get(tbl);
        _options.data.action = "update";
      }
    }

    _options.type = "PUT";

      return ajax( _options );
};

  //@Function Name : pullTable
  //@objective : get all records from DB
  //@return AJAX promise Object

syncHelper.pullTable = function(appName, tbl)
{
  syncHelper.setMessage('Retrieving Table Records', $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver);
  return ajax( syncHelper.setRequestData(appName,'pull',false,tbl) ); 
};

//@Function Name Pull
  //@Objective Pull Table from the server
  //@Return SyncState Object {}

syncHelper.pull = function(appName)
{
  syncHelper.setMessage('Pull  State Started', $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver);
  return new startSyncState(appName).getDBRecords();
};