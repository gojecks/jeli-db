//Sync Functionality
function jEliDBSynchronization(appName)
{
  var entity = null,
      networkResolver = $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver,
      conflictLog = {},
      _recordResolvers = $queryDB.$getActiveDB(appName).$get('recordResolvers');


  //Sync Error Message Logger
  function setMessage(log)
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
  }

  //comparism functionality
  //@function Name SnapShot
  //@param server data, local data
  function snapShot(server,client)
  {
    var counter = 0,
        $hashChanges = $isEqual(server.$hash,client.$hash);
      function checker(diffLoop,diffAgainst,_changes,type)
      {
        function increaseCounter()
        {
            _changes.diff++;
            counter++;
        }

        for(var inx in diffLoop)
        {
            //set the record to update
            var _diffData = {key:inx,data:diffLoop[inx]},
                _search = expect(diffAgainst).search(null,function(item,idx)
                {
                    //search data
                    if($isEqual(type,'data'))
                    {
                      return $isEqual(item._ref,_diffData.data._ref);
                    }else{
                        //search columns
                        return $isEqual(idx,inx);
                    }
                });
            //server data exist and local data exists
            if(_search)
            {
              //changes have been made to either client or server
              //cache the changes
              if(!$isEqual(JSON.stringify(diffLoop[inx]), JSON.stringify(_search)))
              {
                //update with client
                _diffData.data = diffLoop[inx];
                _changes.update.push(_diffData);
                increaseCounter();
              }
            }else if( diffLoop[inx] && !_search)
            {
               //delete data from client
              if($isEqual(_changes.changesFound,'Local'))
              {
                _changes.insert.push(_diffData);                
              }else
              {
                 _changes.delete.push(_diffData);
              }

              increaseCounter();
            }
        }

        return _changes;
      }

    this.data = function()
    {
      var _sdata = server.data || [],
          _cdata = client.data || [],
          _changes = {update:[],insert:[],delete:[],diff:0,changesFound:'server'},
          diffLoop = _sdata,
          diffAgainst = _cdata;
        //check if client added new data
        if(_sdata.length < _cdata.length)
        {
            diffLoop = _cdata;
            diffAgainst = _sdata;
            _changes.changesFound = 'Local';
        }

        return checker(diffLoop,diffAgainst,_changes,'data');
    };

    this.columns = function()
    {
      var _scol = server.columns[0] || {},
          _ccol = client.columns[0] || {},
          _changes = {update:[],insert:[],delete:[],diff:0,changesFound:'server'},
          diffLoop = _scol ,
          diffAgainst = _ccol;
        //check if client added new data
        if(Object.keys(diffLoop).length < Object.keys(diffAgainst).length)
        {
            diffLoop = _ccol;
            diffAgainst = _scol;
            _changes.changesFound = 'Local';
        }

        return checker(diffLoop,diffAgainst,_changes);
    };

    this.foundChanges = function()
    {
      return counter;
    };

    this.$hashChanges = function()
    {
      return $hashChanges;
    };

    this.$noLocalData = function()
    {
        return (server.data || []).length && !client.data.length;
    };
  }

  //function fakeTable
  function fakeTable()
  {
    return ({
      $hash : null,
      data:[],
      columns : [{}]
    });
  }

  //function to bypass undefined table in table set
  function setTable(tbl)
  {
    return (!$isUndefined(tbl) && tbl || fakeTable() );
  }

  //comparison
  function compare(server,local,metadata)
  {
    var changes = {hashChanged :0,dataChanged:0};
        //process server tables
          var comparism = new snapShot(server, local),
              tbl = server.TBL_NAME;
              conflictLog[server.TBL_NAME] = {
                data : comparism.data(),
                columns : comparism.columns()
              };
         //@Local Table was found     
        if(local)
        {
            if(!comparism.$hashChanges() || comparism.$noLocalData())
            {
              setMessage('Table('+tbl+') was updated on the server');
              changes.hashChanged = 1;
            }

            if(comparism.foundChanges())
            {
              changes.dataChanged = 1;
            }

        }else
        {
          //ignore deleted tables
          var checkDeletedTables = networkResolver.deletedRecords.table[server.TBL_NAME];
          if( checkDeletedTables )
          {
            if(!$isEqual(checkDeletedTables,server.$hash))
            {
              setMessage('Table ('+tbl+') was dropped on your local DB, but have lastest changes');
              changes.hashChanged++;
            }
          }else
          {
            setMessage('Synchronizing New Table('+tbl+') to your local DB');
            changes.hashChanged++;
          }
        }

      return changes;
  }

  //UpdateHash Fn
  function updateHash(tableToUpdate,hash)
  {
    if(!$isObject(tableToUpdate))
    {
      tableToUpdate =  $queryDB.DB.$getTable(appName,tableToUpdate);
    }

    //Update Hash
    tableToUpdate.$hash = hash || GUID();
    tableToUpdate.lastModified = +new Date;
    delete tableToUpdate._$;
    $queryDB.$taskPerformer.localStorage.updateDB(appName);
  }

  //@FN NAME finalizeProcess();
  function finalizeProcess()
  {
     networkResolver.handler.onSuccess(dbSuccessPromiseObject("sync",'Synchronization Complete without errors'));
  }

  //@Function Name KillState
  function killState()
  {
    networkResolver.handler.onError(dbErrorPromiseObject("Completed with Errors, please check log"));
  }

  function printConflictLog()
  {
    for(var i in conflictLog)
    {
        setMessage('---Log for '+i+' table----');
        var cList = ["delete","insert","update"],
            cLog = ["data","columns"];
          for(var log in cLog)
          {
            setMessage(cLog[log].toUpperCase() +' Changes: '+conflictLog[i][cLog[log]].changesFound);
            for(var list in cList)
            {
              setMessage(cList[list].toUpperCase()+" : "+conflictLog[i][cLog[log]][cList[list]].length)
            }
          }
    }

  }

    function getSchema(requiredData)
    {
      var _options = setRequestData('schema',false,prepareSyncState().tables),
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
    }

  //@Function Name : clientService
  //@return OBJECT
  function clientService()
  {
      //@Function GET
      //Objective  : Query a database
      function requestFromDB(options,tbl){
        var $defer = new $p();
        ajax(options)
        .then(function(res)
        {
          $queryDB.DB
          .$resolveUpdate(appName,tbl,{insert:res.data._rec})
          .then(function(_ret)
          {
            $queryDB.$taskPerformer
            .localStorage
            .updateDB(appName,tbl);
            //resolve promise
            $defer.resolve(sqlResultExtender(dbSuccessPromiseObject('select',""),_ret.insert));
          });

        },function(res)
        {
          $defer.reject(dbErrorPromiseObject("Unable to fetch records"));
        });

          return $defer;
      }

      //Request From Api using Ref ID
      this.getByRef = function(tbl,query,limit)
      {
          var _options = setRequestData('query',true,tbl);
              _options.data.query = {type:"_ref",limit:"JDB_SINGLE",param:query};
          
          return requestFromDB(_options,tbl);
      };

      //get all data that matches query
      this.getAll = function(tbl,query){
          var _options = setRequestData('query',true,tbl);
              _options.data.query = {type:"_data",limit:"JDB_MAX",param:query};
          
          return requestFromDB(_options,tbl);
      };

      //get one data that matches query
      this.getOne = function(tbl,query){
          var _options = setRequestData('query',true,tbl);
              _options.data.query = {type:"_data",limit:"JDB_SINGLE",param:query};
          
          return requestFromDB(_options,tbl);
      };
  }


    clientService.prototype.resource = pullResource;
    //get DB Schema
    clientService.prototype.getSchema = getSchema;

    //@Function Put
    //Objectives : Update the Table Records
    clientService.prototype.put = function(tbl,data)
    {
      var _options = setRequestData('push',false,tbl),
          $defer = new $p();
          _options.data.postData = data;
          _options.data.action = 'update';
          _options.type = "PUT";

          ajax( _options )
          .then(function(res)
          {
            $defer.resolve(res.data);
            //empty our local recordResolver
            _recordResolvers.$isResolved(tbl).updateTableHash(res.data.$hash);
          },function(res)
          {
            $defer.reject(res);
          });

        //return the event
        return $defer;
    };

    //@Function Delete
    //Objectives : remove data from a table
    clientService.prototype.delete = function(tbl,data)
    {
        var _options = setRequestData('delete',true,tbl),
            $defer = new $p();
           _options.data.query = data;
           _options.type = "DELETE";

        //perform JSON Task
        ajax(_options)
          .then(function(res)
          {
            $defer.resolve(res.data);
          },function(res)
          {
            $defer.reject(res);
          });

          return $defer;
    };

    //Revalidate Expired Users
    clientService.prototype.reAuthorize = function(data){
      var _options = setRequestData('reauthorize',false),
        $defer = new $p();
        _options.data.postData = data;
        _options.type = "POST";

        ajax( _options )
        .then(function(res)
        {
          $defer.resolve(res.data);
          //empty our local recordResolver
        },function(res)
        {
          $defer.reject(res);
        });

        return $defer;
    };

    //setRequestData FN
  function setRequestData(state,ignore,tbl)
  {
    var options = $queryDB.buildOptions(appName,tbl,state);
    //ignore post data
    if(!ignore)
    {
      switch(state.toLowerCase())
      {
        case('push'):
        case('syncstate'):
          options.data.postData = $queryDB.DB.$getTable(appName,tbl);
          options.data.action = "overwrite";
        break;
        case('resource'):
          var resources = $queryDB.$getActiveDB(appName).$get('resourceManager').getResource();
          options.data.postData = resources;
        break;
      }
    }

    return options;
  }

  //@Function Name syncResourceToServer
  //@Objective : Update the server resource File

  function syncResourceToServer()
  {
    setMessage('Resource synchronization started');
    var _options = setRequestData('resource','','');
        _options.type = "PUT";

    return ajax(_options);

  }

  //Merge Db
  function mergeTbl(serverData,tbl)
  {
      //the local DB with SERVER DB
      $queryDB
      .DB
      .$mergeTable(serverData,tbl)
      .then(function(suc)
      {
          $queryDB.$taskPerformer.localStorage.updateDB(appName,tbl);
          setMessage(suc.message);
          finalizeProcess();
      },function(fai)
      {
          setMessage(fai.message);
          killState();
      });

  }

  //@Function Name Conflict
  //Checks for conflict between server and client records

  function conflict(resourceChecker,tbl)
  {
    var serverTbl = [],
        clientTbl = $queryDB.DB.$getTable(appName , tbl),
        $promise = new $p();
    //getLatest from server
    if(resourceChecker)
    {
          //Perform Merge
        if(!entity)
        {
            entity = [tbl];
        }
          //client table was found
          if(clientTbl)
          {
              pull()
              .then(function(response)
              {
                  serverTbl = response.data[tbl];
                  if(serverTbl)
                  {
                    var $diff = compare(serverTbl,clientTbl,resourceChecker);
                    if($diff.hashChanged)
                    {
                      setMessage('Lastest Update found on the Server');
                      if(networkResolver.conflictResolver && $isFunction(networkResolver.conflictResolver))
                      {
                          networkResolver.conflictResolver.apply(networkResolver.conflictResolver,[serverResponse,clientResponse]);
                      }
                      
                      //reject the promise
                      $promise
                      .reject({status:"error",conflictRecord:serverTbl,code:402});
                      return;
                    }


                    //data have changed after last pull
                      printConflictLog();
                       //update
                      $promise
                      .resolve({status:"success",pushRecord:conflictLog[tbl],code:200});

                  }
              },function(mergeResponse)
              {
                  setMessage('unable to check for conflict, please check your internet setting');
                  killState();
              });
          }    
      }

    return $promise;
  }

  //@Function Name Pull
  //@Objective Pull Table from the server
  //@Return SyncState Object {}

  function pull()
  {
    setMessage('Pull  State Started');
    return new startSyncState($queryDB.$getActiveDB(appName).$get('resourceManager').getResource()).getDBRecords();
  }

  //@Function pullResource
  //Pull Resource From the Server
  function pullResource()
  {
      setMessage('Pulling DB resource file');
      return ajax(setRequestData('resource',true));
  }


  //@Function Name Push
  //Objective : update the server database with client records

  function push(tbl,data,state)
  {
      setMessage('Initializing Push State for table('+tbl+')');
      //check state
      state = state || 'push';
      var _options = setRequestData(state,false,tbl);
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
  }


  function commit()
  {
      setMessage('Commit State Started');
  }

  //@Function Name : pullTable
  //@objective : get all records from DB
  //@return AJAX promise Object

  function pullTable(tbl)
  {
    setMessage('Retrieving Table Records');

    return ajax( setRequestData('pull',false,tbl) ); 
  }

  function printLog()
  {
    for(var log in networkResolver.logger)
    {
      console.log(networkResolver.logger[log]);
    }
  }

  //@Fn Name prepareTables
  //@return ARRAY of tables
  function prepareSyncState()
  {
      var tbls = [],
          localResource = getStorageItem(appName) || $queryDB.$getActiveDB(appName).$get('resourceManager').getResource();
        if(localResource.tables || localResource.resourceManager)
        {
          tbls = Object.keys(localResource.tables || localResource.resourceManager);
        }

        //check if table was requested
      if($isArray(entity))
      {
        tbls = entity
      }


      return ({tables:tbls});
  }

  //@Function Name adjustPushRecord
  function processLocalUpdate(tbl)
  {
      if(tbl)
      {
        //get the current recordResolver state
        var resolvedData = conflictLog[tbl],
            localResolved = _recordResolvers.$get(tbl),
            toResolve = [];

          if(resolvedData && resolvedData.data && resolvedData.data.delete)
          {
              for(var d in resolvedData.data.delete)
              {
                var _search = expect(localResolved.data.delete).search(resolvedData.data.delete[d].data);

                if(!_search)
                {
                  toResolve.push(resolvedData.data.delete[d].data);
                }
              }

              //update the local tables
              $queryDB.DB.$updateTableData(tbl,toResolve);
              $queryDB.$taskPerformer.localStorage.updateDB(appName,tbl);
          }

          //empty our local recordResolver
          _recordResolvers.$isResolved(tbl);
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
            new startSyncState(serverResource).process();
        }else{
          finalizeProcess();
        }
      }
    };

    this.fail = function(res)
    {
      setMessage('Failed to synchronize, unabled to resolve with the server, please try again');
      killState();
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

      var _options = setRequestData(api,true),
            $defer = new $p();
           _options.data.remove = data;
           _options.type = "DELETE";

        //perform JSON Task
        ajax(_options)
        .then(this.done(_task),this.fail);
    }
  }

  function startSyncState(resource)
  {
     var syncState = prepareSyncState(),
        failedState = [],
        queue = 0,
        pullRecordList = {},
        $defer = new $p();

          //processQueue()
          function processQueue(inc,state)
          {
              var currentProcessTbl = syncState.tables[inc];
            //set message status
              setMessage('Synchronization started for table('+currentProcessTbl+')');
              new synchronizeTable(currentProcessTbl)[state]();
              //increment queue
              queue++;

          }

          function synchronizeTable(currentProcessTbl)
          {

              this.push = function()
              {

                function pushErrorState()
                {
                    failedState.push(currentProcessTbl);
                    nextQueue({state:'Error',failedTables:failedState},'push');
                }

                function pushSuccessState($hash)
                {
                    setMessage('Push completed for table('+currentProcessTbl+')');
                    //updateHash
                    updateHash(currentProcessTbl,$hash);
                    processLocalUpdate(currentProcessTbl);
                    nextQueue({state:'Success'},'push');
                }

                  //Allow Push State
                  function allowPushState(data)
                  {
                    //api : /sync/state
                    //sync state can only be done by Authorized Application
                    var state = ((!data)?'syncState':'push');
                    push(currentProcessTbl,data,state)
                    .then(function(pushResponse)
                    {
                      var okay = pushResponse.data.ok;

                      if(okay)
                      {
                        pushSuccessState(pushResponse.data.$hash);
                      }else
                      {
                        pushErrorState();
                      }
                      
                    },function(pushErrorResponse)
                    {
                        pushErrorState();
                    });
                  }

                  if(!resource || (resource && !resource.resourceManager[currentProcessTbl]))
                  {
                      setMessage('New Table created and needs to sync with Server');
                      allowPushState(false);
                  }else
                  {
                      conflict(resource,currentProcessTbl)
                      .then(function(response)
                      {
                        //if columns was updated
                        //Push all records to the server
                        if(response.pushRecord.columns.diff)
                        {
                            allowPushState(false);
                        }else{
                          //push only updated records
                          //check pushRecord Status
                          allowPushState(response.pushRecord);
                        }
                        
                      },function(response)
                      {
                          if(confirm('Update your table('+currentProcessTbl+') with Server records (yes/no)'))
                          {
                              setMessage('Updating Local('+currentProcessTbl+') with Server('+currentProcessTbl+')');
                              mergeTbl(response.conflictRecord,currentProcessTbl);
                          }
                      });
                  }
              };

              //Pull State
              this.pull = function()
              {
                  pullTable(currentProcessTbl)
                  .then(function(tblResult)
                  {
                    //update the recordList
                    var tblData = tblResult.data._data || JSON.stringify(fakeTable());
                    pullRecordList[currentProcessTbl] = JSON.parse(tblData);

                    //goto next queue
                    nextQueue({state:'Success'},'pull');
                  },function(pullErrorResponse)
                  {
                      failedState.push(currentProcessTbl);
                      nextQueue({state:'Error',failedTables:failedState},'pull');
                  });
              };
          }

          //finishQueue State
          function finishQueue(state)
          {
            var states = ({
                push : function(response)
                {
                    finalizeProcess();
                    //remove deleteRecords
                    $queryDB.$taskPerformer.localStorage.del($queryDB.$delRecordName);
                },
                pull : function()
                {
                  $defer.resolve({
                    state:'Success',
                    status:200,
                    data : pullRecordList
                  });
                }
            });

              //@Function Name Annonymous
              //parameter : XMLHTTPRESPONSE Object
              return function(response)
              {
                  printConflictLog();
                  if($isEqual(syncState.tables.length,queue))
                  {
                    if(failedState.length)
                    {
                      setMessage('synchronization failed for '+failedState.join(','));
                      networkResolver.handler.onError(dbErrorPromiseObject(response));
                      $defer.reject(response);
                    }else
                    {
                        states[state](response);
                    }
                  }
              };
          }


          function nextQueue(response,state)
          {
              if(syncState.tables.length  >= (queue + 1))
              {
                processQueue(queue,state);
              }else
              {
                //Finalized all tables
                finishQueue(state)(response);
              }
          }

    this.process = function(state)
    {
        if(syncState.tables.length)
        {
          processQueue(queue,'push');
        }else{
          finishQueue('push')({});
        }


    };

    this.getDBRecords = function()
    {
        processQueue(queue,'pull');

        return $defer;
    };
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
          pullResource()
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
                        new startSyncState(false).process();
                      }else
                      {
                        //failed to set resource
                        setMessage('Resource synchronization failed');
                        killState();
                      }
                  },function()
                  {
                    setMessage('Resource synchronization failed, please check your network');
                    killState();
                  });
              }else
              {
                var _delRecordManager = getStorageItem($queryDB.$delRecordName),
                    removedSyncState = null,
                    _pulledResource = purifyJSON(resourceChecker.resource);

                if(_delRecordManager && _delRecordManager[appName]){
                  //start deleted Sync State
                  new deleteSyncState(_delRecordManager[appName],_pulledResource).process();
                }else{
                  //start sync state
                  new startSyncState(_pulledResource).process();
                };
                
              }
          },function(err)
          {
            setMessage('Pull Request has failed, please check your network');
            setMessage(err.data.error.message);
            killState();
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
                    processEntity : processEntity,
                    resource : pullResource,
                    pull : pull,
                    push : push,
                    getSchema : getSchema
                });
      }else
      {
          return new clientService();
      }
  }

  this.Entity = function(tblName)
  {
    entity = maskedEval(tblName);
    //set Message for Entity
    return ({
      configSync : configSync
    });
  };

}