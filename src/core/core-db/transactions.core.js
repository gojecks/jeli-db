//Query DB
DBEvent.prototype.transaction = function(table,mode)
{
  var dbName = this.name;
    //getRequired Table Fn
    function getRequiredTable(cTable)
    {
      if($queryDB.$getTable(dbName,cTable))
      {
        return $queryDB.$getTable(dbName,cTable);
      }else
      {
          err.push("There was an error, Table ("+table+") was not found on this DB ("+dbName+")");
      }
    }

    // create a new defer state
    var defer = new $p();
    if(table)
    {
        var tableData = null,
            $self = this,
            err = [],
            isMultipleTable = false;

        //required table is an array
        if($isArray(table))
        {
            tableData = {};
            var c = table.length;
            while(c--)
            {
              var tbl = table[c],
                  saveName = tbl;
              if(expect(tbl).contains(' as '))
              {
                var spltTbl = tbl.split(' as ');
                    spltTbl.filter(function(item,idx)
                    {
                      spltTbl[idx] = $removeWhiteSpace( item );
                      return 1;
                    });

                tbl = spltTbl.shift();
                saveName = spltTbl.pop();
              }

              tableData[saveName] = getRequiredTable(tbl)
            }

          //change mode to read
          mode = "read";
          isMultipleTable = true;
        }else
        {
          tableData = getRequiredTable(table);
          table = [table];
        }
          

        if(err.length)
        {
          defer.reject({message:err.join("\n"),errorCode:401});
        }else
        {
          defer.resolve({result :  new jTblQuery(tableData,mode,isMultipleTable, table),tables:table,mode:mode });
        }
    }

    return new DBPromise( defer );
};