/**
 * Checks for conflict between server and client records
 * @param {*} appName 
 * @param {*} tbl 
 * @returns 
 */
function SyncConflictChecker(appName, tbl) {
    var $process = syncHelper.process.getProcess(appName);
    var networkResolver = $process.getSet('networkResolver');
    var clientTbl = DatabaseSyncConnector.$privateApi.getTable(appName, tbl);
    //getLatest from server
    if (!syncHelper.entity) {
        syncHelper.entity = [tbl];
    }

    /**
     * 
     * @param {*} schemaResponse 
     * @returns 
     */
    function handleSchemaSuccess(schemaResponse, resolve, reject) {
        var serverTbl = schemaResponse.schemas[tbl];
        if (serverTbl) {
            //process server tables
            var snapshot = new SnapShot(serverTbl, clientTbl);
            var log = {};
            log[tbl] = snapshot.getSnap();
            $process.getSet('syncLog', log);
            //@Local Table was found     
            if (!clientTbl) {
                //ignore deleted tables
                var checkDeletedTables = networkResolver.deletedRecords.table[tbl];
                if (checkDeletedTables) {
                    if (checkDeletedTables !== serverTbl._hash) {
                        syncHelper.setMessage('Table (' + tbl + ') was dropped on your local DB, but have changes on the server');
                    }
                } else {
                    syncHelper.setMessage('Synchronizing New Table(' + tbl + ') to your local DB');
                }
            }

            if (snapshot.hashChanges) {
                syncHelper.setMessage('Table(' + tbl + ') was updated on the server');
                //reject the promise
                reject({ status: "error", schema: serverTbl, isLocalLastModified: snapshot.isLocalLastModified });
                return;
            }
            //update
            resolve({ status: "success", changes: snapshot.counter });
        } else {
            //data have changed after last pull
            syncHelper.setMessage('Table schema was not found on the SERVER');
            //update
            resolve({ status: "success", changes: 1 });
        }
    }

    return new Promise(function(resolve, reject) {
        //Perform Merge
        //client table was found
        syncHelper.getSchema(appName, [tbl])
            .then(function(schema) {
                handleSchemaSuccess(schema, resolve, reject);
            }, function() {
                syncHelper.setMessage('unable to check for conflict, please check your internet setting');
                syncHelper.killState(appName);
            });
    });
}