//@Function Name Conflict
//Checks for conflict between server and client records
/**
  @param: appName
  @param: resourceChecker
  @param: tableName
**/

function syncConflictChecker(appName, resourceChecker,tbl)
{
  var serverTbl = [],
      clientTbl = $queryDB.$getTable(appName , tbl),
      $promise = new $p(),
      networkResolver = $queryDB.$getActiveDB(appName).$get('resolvers').networkResolver;
  //getLatest from server
  if(resourceChecker)
  {

     if(!syncHelper.entity)
      {
        syncHelper.entity = [tbl];
      }
        //Perform Merge
        //client table was found
        if(clientTbl)
        {
            syncHelper.pullTable(appName, tbl)
            .then(function(tblResult)
            {
                serverTbl = tblResult.data._data || syncHelper.createFakeTable();;
                if(serverTbl)
                {
                  var $diff = syncDataComparism(serverTbl, clientTbl, resourceChecker, networkResolver);
                  if($diff.hashChanged)
                  {
                    syncHelper.setMessage('Lastest Update found on the Server', networkResolver);

                    if(networkResolver.conflictResolver && $isFunction(networkResolver.conflictResolver))
                    {
                        networkResolver.conflictResolver.apply(networkResolver.conflictResolver,[serverResponse, clientResponse]);
                    }
                    
                    //reject the promise
                    $promise
                    .reject({status:"error",conflictRecord:serverTbl,code:402});
                    return;
                  }


                  //data have changed after last pull
                    syncHelper.printConflictLog(networkResolver);
                     //update
                    $promise
                    .resolve({status:"success",pushRecord:syncHelper.conflictLog[tbl],code:200});

                }
            },function(mergeResponse)
            {
                syncHelper.setMessage('unable to check for conflict, please check your internet setting', networkResolver);
                syncHelper.killState(networkResolver);
            });
        }    
    }

  return $promise;
}
