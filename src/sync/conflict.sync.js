/**
 * Checks for conflict between server and client records
 * @param {*} conflictChecker 
 */
function SyncConflictChecker(appName, tbl) {
    var $process = syncHelper.process.getProcess(appName);
    var networkResolver = $process.getSet('networkResolver');
    var $promise = new _Promise();
    var clientTbl = privateApi.getTable(appName, tbl);
    //getLatest from server
    if (!syncHelper.entity) {
        syncHelper.entity = [tbl];
    }
    //Perform Merge
    //client table was found
    syncHelper.getSchema(appName, [tbl])
        .then(function(tblResult) {
            var serverTbl = tblResult.schemas[tbl];
            if (serverTbl) {
                var $diff = syncDataComparism(serverTbl, clientTbl, networkResolver);
                if ($diff.hashChanged) {
                    syncHelper.setMessage('Latest Update found on the Server');
                    //reject the promise
                    $promise.reject({ status: "error", conflictRecord: serverTbl });
                    return;
                }

                //data have changed after last pull
                syncHelper.printSyncLog(networkResolver, appName);
                //update
                $promise.resolve({ status: "success", pushRecord: $process.getSet('syncLog')[tbl] });
            } else {
                //data have changed after last pull
                syncHelper.setMessage('Table schema was not found on the SERVER');
                //update
                $promise.resolve({ status: "success", pushRecord: false });
            }
        }, function(mergeResponse) {
            syncHelper.setMessage('unable to check for conflict, please check your internet setting');
            syncHelper.killState(appName);
        });

    return $promise;
}