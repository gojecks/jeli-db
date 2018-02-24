//@Function Name Conflict
//Checks for conflict between server and client records
/**
  @param: appName
  @param: resourceChecker
  @param: tableName
**/

function syncConflictChecker(appName, resourceChecker, tbl) {
    var serverTbl = [],
        clientTbl = $queryDB.$getTable(appName, tbl),
        $promise = new $p(),
        $process = syncHelper.process.getProcess(appName),
        networkResolver = $process.getSet('networkResolver');

    //getLatest from server
    if (!syncHelper.entity) {
        syncHelper.entity = [tbl];
    }
    //Perform Merge
    //client table was found
    syncHelper.pullTable(appName, tbl)
        .then(function(tblResult) {
            serverTbl = tblResult.data._data;
            if (serverTbl) {
                var $diff = syncDataComparism(serverTbl, clientTbl, resourceChecker, networkResolver);
                if ($diff.hashChanged) {
                    syncHelper.setMessage('Lastest Update found on the Server', networkResolver);

                    //reject the promise
                    $promise
                        .reject({ status: "error", conflictRecord: serverTbl, code: 402 });
                    return;
                }


                //data have changed after last pull
                syncHelper.printSyncLog(networkResolver, appName);
                //update
                $promise
                    .resolve({ status: "success", pushRecord: $process.getSet('syncLog')[tbl], code: 200 });

            } else {
                //data have changed after last pull
                syncHelper.setMessage('Table schema was not found on the SERVER', networkResolver);
                //update
                $promise
                    .resolve({ status: "success", pushRecord: false, code: 200 });
            }
        }, function(mergeResponse) {
            syncHelper.setMessage('unable to check for conflict, please check your internet setting', networkResolver);
            syncHelper.killState(appName);
        });

    return $promise;
}