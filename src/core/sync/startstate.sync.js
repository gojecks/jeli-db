  /**
   * 
   * @param {*} appName 
   * @param {*} resource 
   */
  function startSyncState(appName, resource) {
      var syncState = syncHelper.prepareSyncState(appName, resource),
          $process = syncHelper.process.getProcess(appName),
          networkResolver = $process.getSet('networkResolver'),
          setMessage = $process.getSet('onMessage'),
          failedState = [],
          queue = 0,
          pullRecordList = {},
          $defer = new $p();

      //processQueue()
      function processQueue(inc, state) {
          var currentProcessTbl = syncState.tables.pop();
          //set message status
          setMessage('Synchronization started for table(' + currentProcessTbl + ')');
          new synchronizeTable(currentProcessTbl)[state]();
          //increment queue
          queue++;
      }

      //Merge Db
      /**
       * 
       * @param {*} serverData 
       * @param {*} tbl 
       */
      function mergeTbl(serverData, tbl) {
          //the local DB with SERVER DB
          $queryDB
              .$mergeTable(serverData, tbl)
              .then(function(suc) {
                  $queryDB.$taskPerformer.updateDB(appName, tbl, null, +new Date);
                  setMessage(suc.message);
                  nextQueue({ state: 'Success' }, 'push');
              }, function(fai) {
                  setMessage(fai.message);
                  nextQueue({ state: 'Success' }, 'push');
              });

      }

      //UpdateHash Fn
      /**
       * 
       * @param {*} tableToUpdate 
       * @param {*} hash 
       */
      function updateHash(tableToUpdate, hash) {
          if ($isString(tableToUpdate)) {
              tableToUpdate = $queryDB.$getTable(appName, tableToUpdate);
          }

          //Update Hash
          tableToUpdate.$hash = hash;
          tableToUpdate.lastModified = +new Date;
      }

      function isDeletedTable(serverResource, tbl) {
          var localResource = $queryDB.$getActiveDB(appName).$get('resourceManager').getResource();
          return (localResource.resourceManager[tbl] && (serverResource && !serverResource[tbl]) &&
              localResource.resourceManager[tbl].lastSyncedDate);
      }

      //@Function Name adjustPushRecord
      /**
       * 
       * @param {*} tbl 
       */
      function processLocalUpdate(tbl) {
          var _recordResolvers = $queryDB.$getActiveDB(appName).$get('recordResolvers');
          if (tbl) {
              //get the current recordResolver state
              var resolvedData = $process.getSet('syncLog')[tbl],
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
              }

              $queryDB.$taskPerformer.updateDB(appName, tbl, null, +new Date);
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
                  setMessage('Push completed for table(' + currentProcessTbl + ')');
                  if ($hash) {
                      updateHash(currentProcessTbl, $hash);
                  }
                  processLocalUpdate(currentProcessTbl);
                  nextQueue({ state: 'Success' }, 'push');
              }

              //Allow Push State
              /**
               * 
               * @param {*} data 
               */
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
                  /**
                   * check is current processing table has been deleted from server
                   * if true
                   *    confirm with user before dropping the table on the client DB
                   * if confirmed
                   *    drop the table and update the resoure
                   */
                  if (isDeletedTable(resource.resourceManager, currentProcessTbl)) {
                      setMessage(currentProcessTbl + ' doesn\'t exist on the server');
                      if (networkResolver.resolveDeletedTable(currentProcessTbl)) {
                          $queryDB.removeTable(currentProcessTbl, appName, true);
                          $queryDB.$getActiveDB(appName).$get('resourceManager').removeTableFromResource(currentProcessTbl);
                          setMessage(currentProcessTbl + ' removed from local DB');
                      }

                      nextQueue({ state: 'error' }, 'push');
                      return;
                  } else {
                      /**
                       * synchronize Newly created Table to the server
                       */
                      setMessage('New Table created and needs to sync with Server');
                      allowPushState(false);
                  }
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
                          if ($isFunction(networkResolver.conflictResolver)) {
                              networkResolver.conflictResolver.apply(networkResolver, [response, currentProcessTbl, mergeTbl, failedConflictResolver]);
                          }
                      });
              }
          };

          function failedConflictResolver() {
              if ($process.getSet('forceSync')) {
                  setMessage('sync was called with -force:yes');
                  allowPushState(false);
                  return;
              }
              setMessage('skipped merging process for this process');
              nextQueue({ state: 'Error' }, 'push');
          }

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
                  if (syncState.postSync.length) {
                      setMessage('Syncing down --' + JSON.stringify(syncState.postSync) + '--');
                      syncHelper
                          .syncDownTables(appName, syncState.postSync, resource)
                          .then(finalize, function(err) {
                              setMessage('Error syncing down, please try again later');
                              finalize();
                          });

                      return;
                  }
                  finalize();

                  function finalize() {
                      syncHelper.finalizeProcess(appName);
                      //remove deleteRecords
                      $queryDB.$taskPerformer.del($queryDB.$delRecordName);
                  }
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
              if (!syncState.tables.length) {
                  if (failedState.length) {
                      setMessage('synchronization failed for ' + failedState.join(','));
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
          if (syncState.tables.length) {
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
          setMessage('Unable to retrieve API key');
          syncHelper.killState(appName);
      }

      this.process = function(loadedApiKey) {
          if (!loadedApiKey) {
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