  /**
   * 
   * @param {*} appName 
   * @param {*} resource 
   */
  function startSyncState(appName, resource) {
      var syncState = syncHelper.prepareSyncState(appName, resource),
          networkResolver = syncHelper.process.getProcess(appName).getSet('networkResolver');
      failedState = [],
          queue = 0,
          pullRecordList = {},
          $defer = new $p();
      //processQueue()
      function processQueue(inc, state) {
          var currentProcessTbl = syncState.tables[inc];
          //set message status
          syncHelper.setMessage('Synchronization started for table(' + currentProcessTbl + ')', networkResolver);
          new synchronizeTable(currentProcessTbl)[state]();
          //increment queue
          queue++;

      }

      //Merge Db
      function mergeTbl(serverData, tbl) {
          //the local DB with SERVER DB
          $queryDB
              .$mergeTable(serverData, tbl)
              .then(function(suc) {
                  $queryDB.$taskPerformer.updateDB(appName, tbl);
                  syncHelper.setMessage(suc.message, networkResolver);
                  nextQueue({ state: 'Success' }, 'push');
              }, function(fai) {
                  syncHelper.setMessage(fai.message, networkResolver);
                  nextQueue({ state: 'Success' }, 'push');
              });

      }

      //UpdateHash Fn
      function updateHash(tableToUpdate, hash) {
          if ($isString(tableToUpdate)) {
              tableToUpdate = $queryDB.$getTable(appName, tableToUpdate);
          }

          //Update Hash
          tableToUpdate.$hash = hash;
          tableToUpdate.lastModified = +new Date;
          delete tableToUpdate._$;
          $queryDB.$taskPerformer.updateDB(appName);
      }

      //@Function Name adjustPushRecord
      function processLocalUpdate(tbl) {
          var _recordResolvers = $queryDB.$getActiveDB(appName).$get('recordResolvers');
          if (tbl) {
              //get the current recordResolver state
              var resolvedData = syncHelper.process.getProcess(appName).getSet('syncLog')[tbl],
                  localResolved = _recordResolvers.$get(tbl),
                  toResolve = [];

              if (resolvedData && resolvedData.data && resolvedData.data.delete) {
                  for (var d in resolvedData.data.delete) {
                      var _search = expect(localResolved.data.delete).search(resolvedData.data.delete[d].data);

                      if (!_search) {
                          toResolve.push(resolvedData.data.delete[d].data);
                      }
                  }

                  //update the local tables
                  $queryDB.$updateTableData(tbl, toResolve);
                  $queryDB.$taskPerformer.updateDB(appName, tbl);
              }

              //empty our local recordResolver
              _recordResolvers.$isResolved(tbl);
          }
      }

      /**
       * 
       * @param {*} currentProcessTbl 
       */

      function synchronizeTable(currentProcessTbl) {

          this.push = function() {

              function pushErrorState() {
                  failedState.push(currentProcessTbl);
                  nextQueue({ state: 'Error', failedTables: failedState }, 'push');
              }

              function pushSuccessState($hash) {
                  syncHelper.setMessage('Push completed for table(' + currentProcessTbl + ')', networkResolver);
                  if ($hash) {
                      updateHash(currentProcessTbl, $hash);
                  }
                  processLocalUpdate(currentProcessTbl);
                  nextQueue({ state: 'Success' }, 'push');
              }

              //Allow Push State
              function allowPushState(data) {
                  //api : /sync/state
                  //sync state can only be done by Authorized Application
                  var state = ((!data) ? 'syncState' : 'push');
                  syncHelper.push(appName, currentProcessTbl, data, state)
                      .then(function(pushResponse) {
                          var okay = pushResponse.data.ok;

                          if (okay) {
                              pushSuccessState(pushResponse.data.$hash);
                          } else {
                              pushErrorState();
                          }

                      }, function(pushErrorResponse) {
                          pushErrorState();
                      });
              }

              if (!resource || (resource && !resource.resourceManager[currentProcessTbl])) {
                  syncHelper.setMessage('New Table created and needs to sync with Server', networkResolver);
                  allowPushState(false);
              } else {
                  syncConflictChecker(appName, resource, currentProcessTbl)
                      .then(function(response) {
                          //if columns was updated
                          //Push all records to the server
                          if (!response.pushRecord || response.pushRecord.columns.diff) {
                              allowPushState(false);
                          } else {
                              //push only updated records
                              //check pushRecord Status
                              allowPushState(response.pushRecord);
                          }

                      }, function(response) {
                          if (confirm('Update your table(' + currentProcessTbl + ') with Server records (yes/no)')) {
                              syncHelper.setMessage('Updating Local(' + currentProcessTbl + ') with Server(' + currentProcessTbl + ')', networkResolver);
                              mergeTbl(response.conflictRecord, currentProcessTbl);
                          } else {
                              if (syncHelper.process.getProcess(appName).getSet('forceSync')) {
                                  syncHelper.setMessage('sync was called with -force:yes', networkResolver);
                                  allowPushState(false);
                                  return;
                              }
                              syncHelper.setMessage('skipped merging process for this process', networkResolver);
                              nextQueue({ state: 'Error' }, 'push');
                          }
                      });
              }
          };

          //Pull State
          this.pull = function() {
              syncHelper.pullTable(appName, currentProcessTbl)
                  .then(function(tblResult) {
                      //update the recordList
                      pullRecordList[currentProcessTbl] = tblResult.data._data || syncHelper.createFakeTable();

                      //goto next queue
                      nextQueue({ state: 'Success' }, 'pull');
                  }, function(pullErrorResponse) {
                      failedState.push(currentProcessTbl);
                      nextQueue({ state: 'Error', failedTables: failedState }, 'pull');
                  });
          };
      }

      /**
       * 
       * @param {*} state 
       */
      var finishQueue = (function() {
          var states = ({
              push: function(response) {
                  syncHelper.finalizeProcess(appName);
                  //remove deleteRecords
                  $queryDB.$taskPerformer.del($queryDB.$delRecordName);
              },
              pull: function() {
                  $defer.resolve({
                      state: 'Success',
                      status: 200,
                      data: pullRecordList
                  });
              }
          });

          //@Function Name Annonymous
          //parameter : XMLHTTPRESPONSE Object
          return function(state, response) {
              syncHelper.printSyncLog(networkResolver, appName);
              if ($isEqual(syncState.tables.length, queue)) {
                  if (failedState.length) {
                      syncHelper.setMessage('synchronization failed for ' + failedState.join(','), networkResolver);
                      networkResolver.handler.onError(dbErrorPromiseObject(response));
                      $defer.reject(response);
                  } else {
                      states[state](response);
                  }
              }
          };
      })();

      /**
       * 
       * @param {*} response 
       * @param {*} state 
       */
      function nextQueue(response, state) {
          if (syncState.tables.length >= (queue + 1)) {
              processQueue(queue, state);
          } else {
              //Finalized all tables
              finishQueue(state, response);
          }
      }

      /**
       * start sync process
       */
      function startProcess() {
          if (syncState.tables.length) {
              processQueue(queue, 'push');
          } else {
              finishQueue('push', {});
          }
      }

      /**
       * End process when unable to retireve API key
       */
      function endProcess() {
          syncHelper.setMessage('Unable to retrieve API key', networkResolver);
          syncHelper.killState(appName);
      }

      this.process = function(loadedApiKey) {
          if (!loadedApiKey) {
              syncHelper
              syncHelper
                  .process
                  .getApplicationApiKey(appName, networkResolver)
                  .then(startProcess, endProcess);
          } else {
              startProcess();
          }
      };

      this.getDBRecords = function() {
          processQueue(queue, 'pull');

          return $defer;
      };
  }