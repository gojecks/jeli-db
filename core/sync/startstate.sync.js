  function startSyncState(appName, resource)
  {
     var syncState = syncHelper.prepareSyncState(appName, resource),
        networkResolver = $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver
        failedState = [],
        queue = 0,
        pullRecordList = {},
        $defer = new $p();
          //processQueue()
          function processQueue(inc,state)
          {
              var currentProcessTbl = syncState.tables[inc];
            //set message status
              syncHelper.setMessage('Synchronization started for table('+currentProcessTbl+')', networkResolver);
              new synchronizeTable(currentProcessTbl)[state]();
              //increment queue
              queue++;

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
                  $queryDB.$taskPerformer.updateDB(appName,tbl);
                  syncHelper.setMessage(suc.message, networkResolver);
                  syncHelper.finalizeProcess(networkResolver);
              },function(fai)
              {
                syncHelper.setMessage(fai.message, networkResolver);
                syncHelper.killState(networkResolver);
              });

          }

            //UpdateHash Fn
          function updateHash(tableToUpdate,hash)
          {
            if(!$isObject(tableToUpdate))
            {
              tableToUpdate =  $queryDB.$getTable(appName,tableToUpdate);
            }

            //Update Hash
            tableToUpdate.$hash = hash || GUID();
            tableToUpdate.lastModified = +new Date;
            delete tableToUpdate._$;
            $queryDB.$taskPerformer.updateDB(appName);
          }

          //@Function Name adjustPushRecord
          function processLocalUpdate(tbl)
          {
            var _recordResolvers = $queryDB.$getActiveDB(appName).$get('recordResolvers');
              if(tbl)
              {
                //get the current recordResolver state
                var resolvedData = syncHelper.conflictLog[tbl],
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
                      $queryDB.$updateTableData(tbl,toResolve);
                      $queryDB.$taskPerformer.updateDB(appName,tbl);
                  }

                  //empty our local recordResolver
                  _recordResolvers.$isResolved(tbl);
              }
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
                  syncHelper.setMessage('Push completed for table('+currentProcessTbl+')', networkResolver);
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
                    syncHelper.push(appName, currentProcessTbl,data,state)
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
                    syncHelper.setMessage('New Table created and needs to sync with Server', networkResolver);
                    allowPushState(false);
                  }else
                  {
                      syncConflictChecker(appName, resource, currentProcessTbl)
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
                            syncHelper.setMessage('Updating Local('+currentProcessTbl+') with Server('+currentProcessTbl+')', networkResolver);
                            mergeTbl(response.conflictRecord,currentProcessTbl);
                          }
                      });
                  }
              };

              //Pull State
              this.pull = function()
              {
                  syncHelper.pullTable(appName, currentProcessTbl)
                  .then(function(tblResult)
                  {
                    //update the recordList
                    pullRecordList[currentProcessTbl] = tblResult.data._data || syncHelper.createFakeTable();

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
                    syncHelper.finalizeProcess(networkResolver);
                    //remove deleteRecords
                    $queryDB.$taskPerformer.del($queryDB.$delRecordName);
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
                  syncHelper.printConflictLog(networkResolver);
                  if($isEqual(syncState.tables.length,queue))
                  {
                    if(failedState.length)
                    {
                      syncHelper.setMessage('synchronization failed for '+failedState.join(','), networkResolver);
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