/*** Table Code **/

function jEliDBTBL(tableInfo)
{
    this.Alter = ({
        drop : function(columnName)
        {
          if($isString(columnName) && tableInfo.columns[0][columnName])
          {
             delete tableInfo.columns[0][columnName];
          }
          //reconstruct the table
            constructTable(function(row)
            {
                if(row.hasOwnProperty(columnName))
                {
                  delete row[columnName];
                }
            });
             //update the DB
            updateDB();
        },
        add : function(type)
        {
          return ({
            key : function(key,tableName)
            {
                switch(type.toLowerCase())
                {
                  case('primary'):
                    if(key && tableInfo.columns[0][key])
                    {
                        tableInfo.primaryKey = key;
                        tableInfo.columns[0][key].primaryKey = true;
                         //update the DB
                          updateDB();
                    }
                  break;
                  case('foreign'):
                    if(key && tableName && tableInfo.columns[0][key])
                    {
                      if(!tableInfo.foreignKey && $queryDB.DB.$getTable(tableInfo.DB_NAME,tableName))
                      {
                        tableInfo.foreignKey = {
                          key : key,
                          table : tableName
                        };
                      }
                       //update the DB
                        updateDB();
                    }
                  break;
                }

                return this;
            },
            column : function(columnName,config)
            {
              if($isString(columnName))
              {
                var nColumn = {};
                    nColumn[columnName] = config?config:{};

                tableInfo.columns[0] = extend({},tableInfo.columns[0],nColumn);
                //reconstruct the table
                constructTable();
                //update the DB
                updateDB();
              }

              return this;
            },
            mode : function(mode)
            {
              if(!tableInfo.allowedMode[mode])
              {
                tableInfo.allowedMode[mode] = 1;
                 //update the DB
                  updateDB();
              }
            }
          });
        }
    });

    //get All the column
    this.columns = function()
    {
        return tableInfo.columns[0];
    };

    this.truncate = function(flag)
    {
      //empty the table
      if(flag)
      {
          tableInfo.data = [];
          //update the DB
          updateDB();
        return dbSuccessPromiseObject("truncate",tableInfo.TBL_NAME +" was truncated");
      }else
      {
        return dbErrorPromiseObject("Table ("+tableInfo.TBL_NAME+") Was not found in "+tableInfo.DB_NAME +" DataBase or invalid flag passed");
      }
    };

      this.drop = function(flag)
      {
          if(flag)
          {
            var delObj = ({
              name:tableInfo.TBL_NAME,
              $hash : tableInfo.$hash,
              db : tableInfo.DB_NAME
            });

            if(!tableInfo.TBL_NAME && !tableInfo.$hash)
            {
              return dbErrorPromiseObject("Invalid Table record passed, please try again.");
            }
              //update the deletedRecords
              $queryDB.$taskPerformer.localStorage.updateDeletedRecord('table',delObj);
              //delete the table from DB
               if($queryDB.DB.removeTable(tableInfo.TBL_NAME,tableInfo.DB_NAME))
               {
                    //push stack
                    updateDB();
               }

            return dbSuccessPromiseObject("drop","Table ("+tableInfo.TBL_NAME +") was dropped successfully");

          }else
          {
            return dbErrorPromiseObject("Table ("+tableInfo.TBL_NAME+") Was not found in "+tableInfo.DB_NAME +" DataBase or invalid flag passed");
          }
      };


      this.onUpdate = jDBStartUpdate('table',tableInfo.DB_NAME,tableInfo.TBL_NAME,tableInfo.$hash);

    //@Function Name updateDB
    //Updates the required Database

    function updateDB()
    {

        $queryDB.stack.push(function()
        {
          $queryDB.$taskPerformer.localStorage.updateDB(tableInfo.DB_NAME,tableInfo.TBL_NAME);
        });
    }

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
            tableInfo.data[idx] = extend(columnObjFn(tableInfo.columns[0]),n);
        });
    }
}

  function columnObjFn(columns)
  {
      var obj = {},
          _dbDefaultValueMatcher = function(val){
            switch(val){
              case('CURRENT_TIMESTAMP'):
                val = +new Date;
              break;
              default:
                val = val || null;
              break;
            }

            return val;
          };

      findInList.call(columns,function(idx,n)
      {
        obj[idx] = _dbDefaultValueMatcher(n.defaultValue || n.default);
      });

      return obj;
  }