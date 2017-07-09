//@Function Name {jTblQuery}
//@argument {object}
// @return Object

function jTblQuery(tableInfo,mode,isMultipleTable, tables){

    var select = "",
      tblMode = mode || 'read',
      _recordResolvers = $queryDB.$getActiveDB(tableInfo.DB_NAME).$get('recordResolvers');

    this.executeState = [];
    this.tableInfo = tableInfo;
    this.tables = tables;
    this.errLog = [];

    this.getError = function(){
      return this.errLog;
    };

    this.setDBError=function(msg)
    {
      if(!expect(this.errLog).contains(msg))
      {
        this.errLog.push( msg );
      }
    };

    this.hasError = function(){
      return this.errLog.length;
    };

    //Check if Table Information is available from the DB
      if(!$isObject(tableInfo))
      {
        errorBuilder('Unable to perform query at the moment, please try again later');
      }

    //Check the required Mode
    if(expect(tblMode).contains('write'))
    {
        this.insert = transactionInsert;
        this.update = transactionUpdate;

        //@Function lastInsertId
        //@parameter null
        //@return INTERGER

        this.lastInsertId = function()
        {
            return tableInfo.lastInsertId;
        };

        this['delete'] = transactionDelete;

    }

    if(expect(tblMode).contains('read'))
    {
      if(isMultipleTable)
      {
          //Query Logic Object
        //Where and SortBy Logics
        this.condition = new $query(tableInfo.data);
      }

   
      this.select = transactionSelect;
      this.getColumn = transactionSelectColumn;
    }


    //rowback function
    function rowBack(state)
    {
      //Check State
      //Write mode must be enable
        if(state && $inArray(state,["insert","delete","update"]))
        {

        }
    }

    /**
      update offline cache
    **/
    this.updateOfflineCache = function(type, data){
        _recordResolvers
        .$set(tableInfo.TBL_NAME)
        .data(type,data);
    }
}


jTblQuery.prototype.execute = function(disableOfflineCache)
{
  if(this.executeState.length)
  {
      var defer = new $p(),
          error = !1,
          $self = this,
          executeLen = this.executeState.length;

      while(executeLen--){
        var ex = this.executeState.pop();
        if(ex.length > 1)
          { 
            var ret = {state:ex[0]};
              try
              {
                var res = ex[1].call(ex[1], disableOfflineCache);
                sqlResultExtender( ret , res );
              }catch(e)
              {
                ret.message = e.message;
                error = true;
              }finally
              {
                defer[!error?'resolve':'reject'](ret);
                $self.errLog = [];

                if(expect(["insert","update","delete"]).contains(ex[0]) && !error)
                {
                    // life processor
                    liveProcessor($self.tableInfo.TBL_NAME, $self.tableInfo.DB_NAME)(ex[0]);
                    $queryDB.stack.push(function()
                    {
                      $queryDB.$taskPerformer.updateDB($self.tableInfo.DB_NAME, $self.tableInfo.TBL_NAME);
                    });
                }
              }
          }
      };
          

      return new DBPromise(defer);
  }
};