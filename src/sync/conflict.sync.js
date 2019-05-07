//@Function Name Conflict
//Checks for conflict between server and client records
/**
  @param: appName
  @param: resourceChecker
  @param: tableName
**/

function syncConflictChecker(conflictChecker, success, error) {
    var serverTbl = [],
        $process = syncHelper.process.getProcess(conflictChecker.appName),
        networkResolver = $process.getSet('networkResolver');

    //getLatest from server
    if (!syncHelper.entity) {
        syncHelper.entity = [conflictChecker.tbl];
    }
    //Perform Merge
    //client table was found
    syncHelper.pullTable(conflictChecker.appName, conflictChecker.tbl)
        .then(function(tblResult) {
            serverTbl = (tblResult || {})._data;
            if (serverTbl) {
                var $diff = syncDataComparism(serverTbl, conflictChecker.clientTbl, networkResolver);
                if ($diff.hashChanged) {
                    syncHelper.setMessage('Latest Update found on the Server');

                    //reject the promise
                    error({ status: "error", conflictRecord: serverTbl, code: 402 });
                    return;
                }


                //data have changed after last pull
                syncHelper.printSyncLog(networkResolver, conflictChecker.appName);
                //update
                success({ status: "success", pushRecord: $process.getSet('syncLog')[conflictChecker.tbl], code: 200 });
            } else {
                //data have changed after last pull
                syncHelper.setMessage('Table schema was not found on the SERVER');
                //update
                success({ status: "success", pushRecord: false, code: 200 });
            }
        }, function(mergeResponse) {
            syncHelper.setMessage('unable to check for conflict, please check your internet setting');
            syncHelper.killState(conflictChecker.appName);
        });

    return $promise;
}