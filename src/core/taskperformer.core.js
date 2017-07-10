    //queryDB taskPerformer
function _privateTaskPerfomer(self){
  var _publicApi = function(){
    this.updateDeletedRecord = updateDeletedRecord;
    this.set = setStorageItem;
    this.get = getStorageItem;
    this.del = delStorageItem;
  };

  _publicApi.prototype.updateDB  = function(name,tblName,updateFn)
  {
    //put the data to DB
    if(name)
    {
      //update the table lastModified
      var table;
        if(tblName)
        {
          table = self.$getTable(name,tblName);
          if(table)
          {
            table.lastModified = +new Date;
            if(updateFn && $isFunction(updateFn)){
              updateFn.apply(updateFn,[table]);
            }
          }

        }

        setStorageItem(name, self.$get(name));
      //update DB key
      var dbRef = self.$getActiveDB().$get('resourceManager').getResource();
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
          self.$getActiveDB().$get('resourceManager').setResource(dbRef);
        }
        //check if storage have been cleared by user
        if(!dbRef){
          this.storageChecker(name);
        }
    }
  };

  _publicApi.prototype.initializeDB = function(name)
  {
      //set recordResolvers
      if(!self.$getActiveDB().$get('resourceManager').getResource())
      {
        return false;
      }else
      {
          //retrieve current DB items
          var storageData = getStorageItem(name),
              $delRecords = getStorageItem(self.$delRecordName);
          //set delRecords
          if(storageData)
          {
            self.$set(name,storageData);

            if($delRecords)
            {
                //update deleted records
                self.$getActiveDB().$get('resolvers').register('deletedRecords', $delRecords);
            }

            return true;
          }
      }

      return false;
  };

  _publicApi.prototype.storageChecker = function(name)
  {
    self.$getActiveDB().$get('resourceManager').setResource(getDBSetUp(name))
  }

  return (new _publicApi);

};
