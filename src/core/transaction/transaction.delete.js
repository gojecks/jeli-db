//@Function Delete
//@Arguments 'Query'
//@return Object
//@ExecuteState return {obj}

function transactionDelete(query)
{
    var $self = this,
        delItem = [];
    new $query(this.tableInfo.data)._(query,function(item,idx){
      delItem.push(item);
    });

    this.executeState.push(["delete",function(disableOfflineCache)
    {
        if(!delItem.length)
        {
          throw Error(["No record(s) to remove"]);
        }else
        {
            $self.tableInfo.data = $self.tableInfo.data.filter(function(item)
            {
              return !$inArray(item,delItem);
            });


              //push records to our resolver
              if(!disableOfflineCache){
                $self.updateOfflineCache('delete',delItem);
              }

              /**
                  broadcast event
              **/
              $queryDB.storageEventHandler.broadcast(eventNamingIndex($self.tableInfo.DB_NAME,'delete'), [$self.tableInfo.TBL_NAME, delItem]);

            //return success Message
            return ({
                message : delItem.length + " record(s) removed"
              });
        }
      }]);

      return this;
};