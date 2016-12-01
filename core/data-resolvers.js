    //@Function Name DBRecordResolvers()
    //@return OBJECTS
    function DBRecordResolvers(name)
    {
        function tableRecordHolder()
        {
            return ({
              delete : [],
              update : [],
              insert : []
            });
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
                    _records[name][tbl].data[type].push.apply(_records[name][tbl].data[type],data);
                    
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
              var tblRecord = _records[name][tbl];

              return ((type)?tblRecord[type]:tblRecord);
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
                 .localStorage
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
