    //queryDB taskPerformer
    $queryDB.$taskPerformer.localStorage = ({

        updateDB : function(name,tblName,updateFn)
        {
          //put the data to DB
          if(name)
          {
            //update the table lastModified
            var table;
              if(tblName)
              {
                table = $queryDB.DB.$getTable(name,tblName);
                if(table)
                {
                  table.lastModified = +new Date;
                  if(updateFn && $isFunction(updateFn)){
                    updateFn.apply(updateFn,[table]);
                  }
                }

              }

              setStorageItem(name,$queryDB.DB.$get(name));
            //update DB key
            var dbRef = $queryDB.$getActiveDB().$get('resourceManager').getResource();
              if(dbRef)
              {
                  dbRef.lastUpdated = +new Date;

                if(tblName && table)
                {
                    if(!dbRef.resourceManager[tblName])
                    {
                       dbRef.resourceManager[tblName] = {
                          $hash : null,
                          lastModified : null,
                          created : null,
                          _ref : null
                       }; 
                    }

                    //extend the DB resource Control
                    for(var i in dbRef.resourceManager[tblName])
                    {
                        dbRef.resourceManager[tblName][i] = table[i];
                    }
                }

                //update
                $queryDB.$getActiveDB().$get('resourceManager').setResource(dbRef);
              }
              //check if storage have been cleared by user
              if(!dbRef){
                this.storageChecker(name);
              }
          }
        },
        updateDeletedRecord : updateDeletedRecord,
        set : setStorageItem,
        get : getStorageItem,
        del : delStorageItem,
        initializeDB : function(name)
        {
            //set recordResolvers
            if(!$queryDB.$getActiveDB().$get('resourceManager').getResource())
            {
              return false;
            }else
            {
                //retrieve current DB items
                var storageData = getStorageItem(name),
                    $delRecords = getStorageItem($queryDB.$delRecordName);
                //set delRecords
                if(storageData)
                {
                  $queryDB.DB.$set(name,storageData);

                  if($delRecords)
                  {
                      //update deleted records
                      $queryDB.$getActiveDB().$get('resolvers').register('deletedRecords', $delRecords);
                  }

                  return true;
                }
            }

            return false;
        },
        storageChecker : function(name)
        {
          $queryDB.$getActiveDB().$get('resourceManager').setResource(getDBSetUp(name))
        }
    });


  function jDBStorage(storageName){
    var _storage = window[storageName] || {};
    this.setItem = function(name,value){
      var filesizeCheck = Math.floor( (((value.length) * 2) / 1024).toFixed(2));
        if(filesizeCheck >= (1024 * 5)){
          $queryDB.getNetworkResolver('logService')("_STORAGE_ERROR:File-Size is too large :"+(filesizeCheck / 1024)+" MB");
          return;
        }

      _storage[name] = value;
    };

    this.getItem = function(name){
      return _storage[name];
    };

    this.removeItem = function(name){
      delete _storage[name];
    };

    this.clear = function(){
      _storage.clear && _storage.clear();
    };
  }
