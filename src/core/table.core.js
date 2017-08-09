/*** Table Code **/

function jEliDBTBL(tableInfo)
{
  this.info = {
    _DBNAME_ : tableInfo.DB_NAME,
    tableName : tableInfo.TBL_NAME
  };

  this.Alter = {};
  this.Alter.drop = function(columnName)
  {
    if($isString(columnName) && tableInfo.columns[0][columnName])
    {
       delete tableInfo.columns[0][columnName];
    }
    //reconstruct the table
      constructTable(function(row)
      {
          if(row._data.hasOwnProperty(columnName))
          {
            delete row._data[columnName];
          }
      });

      /**
          broadcast event
      **/
      $queryDB.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME,'update'), [tableInfo.TBL_NAME, tableInfo.data]);
       //update the DB
      jEliUpdateStorage(tableInfo.DB_NAME,tableInfo.TBL_NAME);
  };

  this.Alter.add = function(type)
  {
    return ({
      key: keyAction,
      index: indexAction,
      mode: modeAction,
      column: columnAction
    });  
  }
  //get All the column
  this.columns = function()
  {
      return jEliDeepCopy(tableInfo.columns[0]);
  };

  this.truncate = function(flag)
  {
    //empty the table
    if(!flag)
    {
      return dbErrorPromiseObject("Table ("+tableInfo.TBL_NAME+") Was not found in "+tableInfo.DB_NAME +" DataBase or invalid flag passed");
    }

    //update the DB
    jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table){
      table.data = [];
      table.$hash = "";
      table._records = table.lastInsertId = 0;
      /**
          broadcast event
      **/
      $queryDB.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME,'onTruncateTable'), [tableInfo.TBL_NAME]);
    });

    return dbSuccessPromiseObject("truncate",tableInfo.TBL_NAME +" was truncated");
  };

  this.drop = function(flag)
  {
    if(!flag)
    {
      return dbErrorPromiseObject("Table ("+tableInfo.TBL_NAME+") Was not found in "+tableInfo.DB_NAME +" DataBase or invalid flag passed");
    }

    if(!tableInfo.TBL_NAME && !tableInfo.$hash)
    {
      return dbErrorPromiseObject("Invalid Table record passed, please try again.");
    }

      //update the deletedRecords
      $queryDB.$taskPerformer.updateDeletedRecord('table',{
        name:tableInfo.TBL_NAME,
        $hash : tableInfo.$hash,
        db : tableInfo.DB_NAME
      });

      /**
        broadcast event
      **/
      $queryDB.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME,'onDropTable'), [tableInfo.TBL_NAME]);

      //delete the table from DB
       if($queryDB.removeTable(tableInfo.TBL_NAME,tableInfo.DB_NAME))
       {
          //push stack
          jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
       }

      return dbSuccessPromiseObject("drop","Table ("+tableInfo.TBL_NAME +") was dropped successfully");      
  };


  this.onUpdate = jDBStartUpdate('table',tableInfo.DB_NAME,tableInfo.TBL_NAME,tableInfo.$hash);


    //Table constructor
    function constructTable(cFn)
    {
        //loop through the table list
        findInList.call(tableInfo.data,function(idx,n)
        {
          //perform task if argument is a function
            if($isFunction(cFn))
            {
              cFn(n);
            }
          //Update the dataSet
            tableInfo.data[idx]._data = extend(columnObjFn(tableInfo.columns[0]),n._data);
        });
    }

    function keyAction(key,tableName)
    {
        switch(type.toLowerCase())
        {
          case('primary'):
            if(key && tableInfo.columns[0][key])
            {
                tableInfo.primaryKey = key;
                tableInfo.columns[0][key].primaryKey = true;
                 //update the DB
                  jEliUpdateStorage(tableInfo.DB_NAME,tableInfo.TBL_NAME);
            }
          break;
          case('foreign'):
            if(key && tableName && tableInfo.columns[0][key])
            {
              if(!tableInfo.foreignKey && $queryDB.$getTable(tableInfo.DB_NAME,tableName))
              {
                tableInfo.foreignKey = {
                  key : key,
                  table : tableName
                };
              }
               //update the DB
                jEliUpdateStorage(tableInfo.DB_NAME,tableInfo.TBL_NAME);
            }
          break;
        }

        return this;
    }

    function columnAction(columnName,config)
    {
      if($isString(columnName))
      {
        var nColumn = {};
            nColumn[columnName] = config?config:{};

        tableInfo.columns[0] = extend({},tableInfo.columns[0],nColumn);
        //reconstruct the table
        constructTable();

         /**
              broadcast event
          **/
          $queryDB.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME,'update'), [tableInfo.TBL_NAME, tableInfo.data]);
        //update the DB
        jEliUpdateStorage(tableInfo.DB_NAME,tableInfo.TBL_NAME);
      }

      return this;
    }

    function indexAction(name, setting){
      tableInfo.index[name] = setting || {unique:false};
    }

    function modeAction(mode)
    {
      if(!tableInfo.allowedMode[mode])
      {
        tableInfo.allowedMode[mode] = 1;
         //update the DB
          jEliUpdateStorage(tableInfo.DB_NAME,tableInfo.TBL_NAME);
      }
    }
}
