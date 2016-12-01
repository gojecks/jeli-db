//Function checks if data is a JSON
    //@return {OBJECT}
    function purifyJSON(data)
    {
      if($isJsonString(data))
      {
        return JSON.parse( data );
      }else
      {
        return undefined;
      }
    }

    //Function to retrieve storage Data
    //@return OBJECT
    function getStorageItem(item)
    {
      var data = $queryDB.$storage.getItem(item);
        //return FN
        return purifyJSON( data || undefined);
    }

    //Function to Store storage data
    //@return JSON String
    function setStorageItem(key,value)
    {
      if(key && value && $isObject(value))
      {
        var data = JSON.stringify(value);
          if($isJsonString(data))
          {
            $queryDB.$storage.setItem(key, data );
          }
      }
    }

    //@Function Delete Storage Item
    function delStorageItem(name)
    {
      if(getStorageItem(name))
      {
        $queryDB.$storage.removeItem(name);
      }

      return true;
    }

    function getDBSetUp(name)
    {
      return ({started : new Date().getTime(),lastUpdated : new Date().getTime(),resourceManager:{}});
    }


    function updateDeletedRecord(ref,obj)
    {
        var checker = getStorageItem($queryDB.$delRecordName),
            _resolvers =  $queryDB.$getActiveDB().$get('resolvers');
        if(checker && checker[obj.db])
        {
          _resolvers.register('deletedRecords', checker[obj.db]);
        }else{
          //Create a new delete Object
          //add a new property : DB_NAME
          checker = {};
          checker[obj.db] = {};
        }

        //Update the resource control
        //only when its table
        if($isEqual(ref,'table'))
        {
          $queryDB.$getActiveDB().$get('resourceManager').removeTableFromResource(obj.name);
        }

        var _delRecords = _resolvers.getResolvers('deletedRecords');
       
        _delRecords[ref][obj.name] = obj.$hash || GUID();


        //extend the delete Object
        //with the current deleteResolver
        checker[obj.db] = _delRecords;
        setStorageItem($queryDB.$delRecordName,checker);
    }
