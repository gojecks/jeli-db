
  // @Function : update
  // @Arguments : parameter[0] (OBJECT || String),parameter[1] (STRING)
  // @Return {Object}
  // @ExecuteState : return Message {STRING}

  function transactionUpdate(updateData, query)
  {
    var $self = this;
      //convert our query
      //Function structureUpdateData()
      function structureUpdateData(setData)
      {
        // return setData when its an object
        if($isObject(setData)){
          return setData;
        }else{
          //check if setData is a string
          var setData = maskedEval(setData);
          switch(typeof setData){
            case('string'):
              //convert String Data to Object
              var nString =  removeSingleQuote(setData),
                  splitComma = nString.split(","),
                  i = splitComma.length,
                  tempObj = {};
              //Loop through the split Data
              while(i--)
              {
                var splitEqualTo = splitComma[i].split("=");
                //set the new Object Data
                tempObj[splitEqualTo[0]] = splitEqualTo[1];
              }
              return tempObj;
            break;
            case('object'):
                return setData;
            break;
            default:
              $self.setDBError('Unable to update Table, unaccepted dataType recieved');
            break;
          }
        }
      }

        //@Arguments.length is 1
        //@query is undefined
        if(!query && $isString(updateData))
        {
          var splitUpdate = $removeWhiteSpace(updateData).split(/(?:where):/gi),
              updateData =  splitUpdate.shift(),
              query = splitUpdate.pop();
        }


          var where,
              setData = structureUpdateData(updateData),
              u = this.tableInfo.data.length,
              updated = 0,
              store = function(idx)
              {
                //set the current Value
                  $self.tableInfo.data[idx]._data = extend({}, $self.tableInfo.data[idx]._data, setData);
                  updated++;
                  rowsToUpdate.push($self.tableInfo.data[idx]);
              },
              rowsToUpdate = [];

          /**
            check if query is an object or string
            set the where query
          **/
          if($isString(query)){
            where = (query)?removeSingleQuote(query):!1
          }else{
            where = query;
          }  

          this.executeState.push(["update",function(disableOfflineCache)
          {
            //Execute Function 
            //Kill Process if error was Found
              if($self.hasError() || !setData)
              {
                throw Error($self.getError());
              }else
              {
                  if(where)
                  {
                    new $query($self.tableInfo.data)._(where,function(item,idx)
                    {
                        //store the data
                        store(idx);
                    });
                  }else
                  {
                    while(u--)
                    {
                      store(u);
                    }
                  }

                  //push records to our resolver
                  if(!disableOfflineCache){
                    $self.updateOfflineCache('update',rowsToUpdate);
                  }

                  /**
                      broadcast event
                  **/
                  $queryDB.storageEventHandler.broadcast('onUpdate',[$self.tableInfo.TBL_NAME, rowsToUpdate]);

                 //empty the rows 
                  rowsToUpdate = [];

                  //return success
                  return {message:updated+" row(s) updated."};
                }
          }]);

      return this;
  };