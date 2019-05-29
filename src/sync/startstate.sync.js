  /**
   * 
   * @param {*} appName 
   * @param {*} resource 
   */
  function startSyncState(appName, resource) {
      var syncState = syncHelper.prepareSyncState(appName, resource),
          $process = syncHelper.process.getProcess(appName),
          networkResolver = $process.getSet('networkResolver'),
          failedState = [],
          queue = 0,
          pullRecordList = {},
          $defer = new _Promise();

      //processQueue()
      function processQueue(inc, state) {
          var currentProcessTbl = syncState.tables.pop();
          //set message status
          syncHelper.setMessage('Synchronization started for table(' + currentProcessTbl + ')');
          var syncCore = new synchronizeTable(currentProcessTbl);
          syncCore[state]();
          //increment queue
          queue++;
      }

      function cleanUp() {
          syncState = $process = networkResolver = failedState = setMessage = failedState = pullRecordList = null;
      }

      //Merge Db
      /**
       * 
       * @param {*} serverData 
       * @param {*} tbl 
       */
      function mergeTbl(serverData, tbl) {
          //the local DB with SERVER DB
          privateApi
              .$mergeTable(appName, serverData, tbl)
              .then(function(suc) {
                  privateApi.$taskPerformer.updateDB(appName, tbl, null, +new Date);
                  syncHelper.setMessage(suc.message);
                  nextQueue({ state: 'Success' }, 'push');
              }, function(fai) {
                  syncHelper.setMessage(fai.message);
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
              tableToUpdate = privateApi.$getTable(appName, tableToUpdate);
          }

          //Update Hash
          tableToUpdate._hash = hash;
          tableToUpdate.lastModified = +new Date;
      }

      function isDeletedTable(serverResource, tbl) {
          var localResource = privateApi.$getActiveDB(appName).$get('resourceManager').getResource();
          return (localResource.resourceManager[tbl] && (serverResource && !serverResource[tbl]) &&
              localResource.resourceManager[tbl].lastSyncedDate);
      }

      //@Function Name adjustPushRecord
      /**
       * 
       * @param {*} tbl 
       */
      function processLocalUpdate(tbl) {
          var _recordResolvers = privateApi.$getActiveDB(appName).$get('recordResolvers');
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
                  privateApi.$updateTableData(tbl, toResolve);
              }

              privateApi.$taskPerformer.updateDB(appName, tbl, null, +new Date);
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

              function pushSuccessState(checksum) {
                  syncHelper.setMessage('Push completed for table(' + currentProcessTbl + ')');
                  if (checksum) {
                      updateHash(currentProcessTbl, checksum);
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
                  var state = ((!data) ? '/database/sync' : '/database/push');
                  syncHelper.push(appName, currentProcessTbl, data, state)
                      .then(function(pushResponse) {
                          var okay = pushResponse.ok;

                          if (okay) {
                              pushSuccessState(pushResponse._hash);
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
                      syncHelper.setMessage(currentProcessTbl + ' doesn\'t exist on the server');
                      if (networkResolver.resolveDeletedTable(currentProcessTbl)) {
                          privateApi
                              .storageEventHandler
                              .broadcast(eventNamingIndex(appName, 'onDropTable'), [currentProcessTbl]);

                          privateApi
                              .$getActiveDB(appName)
                              .$get('resourceManager')
                              .removeTableFromResource(currentProcessTbl);

                          syncHelper.setMessage(currentProcessTbl + ' removed from local DB');
                      }

                      nextQueue({ state: 'error' }, 'push');
                      return;
                  } else {
                      /**
                       * synchronize Newly created Table to the server
                       */
                      syncHelper.setMessage('New Table created and needs to sync with Server');
                      allowPushState(false);
                  }
              } else {
                  syncConflictChecker({
                      tbl: currentProcessTbl,
                      appName: appName,
                      clientTbl: privateApi.$getTable(appName, currentProcessTbl),
                      resourceChecker: resource
                  }, function(response) {
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
                  syncHelper.setMessage('sync was called with -force:yes');
                  allowPushState(false);
                  return;
              }
              syncHelper.setMessage('skipped merging process for this process');
              nextQueue({ state: 'Error' }, 'push');
          }

          //Pull State
          this.pull = function() {
              syncHelper.pullTable(appName, currentProcessTbl)
                  .then(function(tblResult) {
                      //update the recordList
                      pullRecordList[currentProcessTbl] = tblResult._data || syncHelper.createFakeTable();

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
                      syncHelper.setMessage('Synching down --' + JSON.stringify(syncState.postSync) + '--');
                      syncHelper
                          .syncDownTables(appName, syncState.postSync, resource)
                          .then(finalize, function(err) {
                              syncHelper.setMessage('Error synching down, please try again later');
                              finalize('killState');
                          });

                      return;
                  }
                  finalize($isEqual(response.state.toLowerCase(), 'error') ? 'killState' : 'finalizeProcess');

                  function finalize(state) {
                      if (state && $isFunction(syncHelper[state])) {
                          syncHelper[state](appName);
                      }
                      //remove deleteRecords
                      privateApi.$taskPerformer.del(privateApi.storeMapping.delRecordName);
                  }
              },
              pull: function(response) {
                  if ($isEqual(response.state.toLowerCase(), 'error')) {
                      $defer.resolve({
                          state: 'Success',
                          status: 200,
                          data: pullRecordList
                      });
                  } {
                      $defer.reject(response);
                  }
              }
          });

          //@Function Name Annonymous
          //parameter : XMLHTTPRESPONSE Object
          return function(state, response) {
              syncHelper.printSyncLog(networkResolver, appName);
              if (failedState.length) {
                  syncHelper.setMessage('synchronization failed for ' + JSON.stringify(failedState));
              }
              states[state](response);
              cleanUp();
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
              finishQueue('push', { state: 'success' });
          }
      }

      /**
       * End process when unable to retireve API key
       */
      function endProcess() {
          syncHelper.setMessage('Unable to retrieve API key');
          syncHelper.killState(appName);
      }

      this.process = function(loadedApiKey) {
          if (!loadedApiKey) {
              syncHelper
                  .process
                  .getApplicationApiKey(appName)
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