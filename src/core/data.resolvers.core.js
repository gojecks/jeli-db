//@Function Name DBRecordResolvers()
//@return OBJECTS
function DBRecordResolvers(name)
{
    function tableRecordHolder()
    {
        return ({
          delete : {},
          update : {},
          insert : {}
        });
    }

    function resolveSyncData(tbl, type){
      var recordsToSync = jEliDeepCopy(_records[name][tbl]);
      Object.keys(recordsToSync.data).map(function(cType){
         Object.keys(recordsToSync.data[cType]).map(function(ref){
          if($isEqual(cType,"delete")){
            recordsToSync.data[cType][ref] = true;
          }else{
            recordsToSync.data[cType][ref] = $queryDB.$getDataByRef($queryDB.$getTableOptions(name, tbl, 'data') || [], ref);
          }
        });
      });

      return recordsToSync;
    }

    var _records = {},
        _lRecordName = "_l_";

    var _fn = ({
      $set : function(tbl)
      {
        if(!_records[name][tbl])
        {
            //set the record
            _records[name][tbl] = {data:tableRecordHolder(),columns:tableRecordHolder()};
        }


        return ({
          data : function(type,data)
          {
              if(data.length)
              {
                //push the data to the list
                data.forEach(function(ref){
                  if($isEqual(type,'update')){
                    if(_records[name][tbl].data['insert'][ref]){
                      delete _records[name][tbl].data['insert'][ref];
                    }
                  }

                  _records[name][tbl].data[type][ref] = true;
                });
         
                setStorageItem(_lRecordName,_records);
              }
          },
          columns : function(type,data)
          {
              if(data.length)
              {
                //push the data to the list
                _records[name][tbl].columns[type].push.apply(_records[name][tbl].columns[type],data);
              
                 setStorageItem(_lRecordName,_records);
              }
          }
        });
      },
      $get : function(tbl,type)
      {
        if(_records[name] && _records[name][tbl])
        {
          return resolveSyncData(tbl, type);
        }

        return {data:tableRecordHolder(),columns:tableRecordHolder()};
      },
      $isResolved : function(tbl)
      {
        var lStorage;
          if(_records[name] && _records[name][tbl])
          {
            delete _records[name][tbl];
            lStorage = getStorageItem(_lRecordName);
            if(lStorage)
            {
              //delete from localStorage
              delete lStorage[name][tbl];
              setStorageItem(_lRecordName,lStorage);
            }
          }

          return ({
            updateTableHash : updateTableHash
          });

          //Update Hash
          function updateTableHash($hash){
             $queryDB.$taskPerformer
             .updateDB(name,tbl,function(table){
                table.$hash = $hash;
             });
          }
      }
    });

    if(!_records[name] && name)
    {
      _records[name] = {};
      var lStorage = getStorageItem(_lRecordName);
      if(lStorage && lStorage[name])
      {
        _records[name] = lStorage[name];
      }
    }

    return _fn;
}
