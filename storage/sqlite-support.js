//jEliDB for Sqlite
function sqliteStorage(type, dbName, CB)
{
  //set Prototype
  //create Database
  //Param Object
  //{name: "mySQLite.db", location: 'default'}

  var privateApis = createDB(dbName),
      _storageTableName = "",
      _started = false,
      _privateStore = {},
      _dbApi = useDB();

  if(!privateApis){
    errorBuilder('No Plugin Support for '+ type);
  }


    function createDB($dbName){
      var ret = null;
      switch((type || '').toLowerCase()){
          case('websql'):
            ret = $isSupport.websql && window.openDatabase(dbName, '1.0', dbName + ' Storage for webSql', 50 * 1024 * 1024);
          break;
          case('sqlite'):
          case('sqlitecipher'):
            ret = ($isSupport.sqlite) && window.sqlitePlugin.openDatabase({name: dbName, location: 'default'});
          break;
        }
        
        return ret;
    }


      function loadAllData(){
        queryPerfomrer('SELECT * FROM _JELI_STORE_', [])
          .then(function(tx, results){
            var len = results.rows.length,i;
                for (i = 0; i < len; i++){
                  _privateStore[results.rows.item(i)._rev] = JSON.parse(results.rows.item(i)._data);
                }

            loadDBData();                
          },txError);
      }


      function loadDBData(){
        if(!_privateStore[dbName]){
          (CB || noop)();
            return;
        }
        var inc = 0,
            tableNames = Object.keys(_privateStore[dbName].tables);
        
        resolveTableData();

        function resolveTableData(){
          if(!tableNames.length){
            // trigger our callback
              (CB || noop)();
            return;
          }

          var current = tableNames.pop();

          _dbApi.select('select * from '+current)
          .then(function(tx, results){
              var len = results.rows.length, i,data = [];
                for (i = 0; i < len; i++){
                  _privateStore[dbName].tables[current].data.push(
                      {
                        _ref:results.rows.item(i)._ref,
                        _data:JSON.parse(results.rows.item(i)._data)
                      }
                  );

                }
                // loadNextData
                resolveTableData();
          });
        }

      }


      function queryPerfomrer(query, data){
        var $promise = new $p();
        privateApis.transaction(function(tx){
          tx.executeSql(query, data, $promise.resolve, $promise.reject);
        });

        return $promise;
      }


   function useDB(){

       var _pub = {},
          _setData = function(data,setCol){
            var col = [],
                val = [];
            for(var i in data){
              col.push((setCol?i+"=":"")+"?");
              if(typeof data[i] === "object"){
                val.push(JSON.stringify(data[i]));
              }else{
                val.push(data[i]);
              }
            }

            return ({
              col:col,
              val:val
            });
          };

       _pub.createTable = function(cQuery){
          var $promise = new $p();
          privateApis.transaction(function(transaction){
            transaction.executeSql(cQuery, [],$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.insert = function(table,data){
        if(!table || !$isObject(data)){
          errorBuilder('Table and data is required');
        }

        var $promise = new $p(),
            columns = Object.keys(data),
            _cData = _setData(data),
            executeQuery = "INSERT OR REPLACE INTO "+table+" ("+columns.join(',')+") VALUES ("+_cData.col.join(',')+")";
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, _cData.val,$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.select = function(executeQuery, data){
          if(!executeQuery){
            errorBuilder('Table is required');
          }

          var $promise = new $p();
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, data || [],$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.delete = function(table,where,ex){
          if(!table){
            errorBuilder('Table and id is required');
          }

          ex = ex || [];
          var $promise = new $p(),
              executeQuery = "DELETE FROM "+table;
              executeQuery+=" "+(where)?where:"";
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, ex || [],$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.update = function(table,data,where){
          if(!table || !$isObject(data)){
            errorBuilder('Table and data is required');
          }

          var $promise = new $p(),
            executeQuery = "UPDATE "+table+" SET ",
            _cData = _setData(data, true);

            executeQuery+=" "+_cData.col.join(',');
            executeQuery+=" "+(where)?where:"";
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, _cData.val ,$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.dropTable = function(table){
          if(!table){
            errorBuilder('Table is required');
          }

          var $promise = new $p(),
            executeQuery = "DROP TABLE  IF EXISTS "+table;

          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, [] ,$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.alterTable = function(tbl, columnName, type){
          var $promise = new $p(),
            executeQuery = "ALTER TABLE "+tbl+" ADD "+columnName+" "+type;

          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, [] ,$promise.resolve,$promise.reject);
          });

          return promise;
       }

       return _pub;
    };


    function removeTableData(obj){
      var tableNames = Object.keys(obj.tables);

        tableNames.forEach(function(tbl){
          obj.tables[tbl].data = [];
        });

        return obj;
    }

    function txError(tx, txError){
      console.log(txError);
    }


    /**
        register to storage events
    **/
    $queryDB.storageEventHandler
    .subscribe('onInsert', function(tbl, data){
      data.forEach(function(_data){
          _dbApi.insert(tbl,_data);
      });
    });

    $queryDB.storageEventHandler
    .subscribe('onUpdate', function(tbl, data){
      data.forEach(function(_data){
          _dbApi.update(tbl, _data," WHERE _ref='"+_data._ref+"'")
          .then(function(){},txError);
      });
    });

    $queryDB.storageEventHandler
    .subscribe('onDelete',function(tbl, data){
        data.forEach(function(_data){
          _dbApi.delete(tbl," WHERE _ref=?", [_data._ref])
          .then(function(){
          },txError);
      });
    });

    $queryDB.storageEventHandler
    .subscribe('onCreateTable', function(tableName, columns){
      _dbApi.createTable('CREATE TABLE IF NOT EXISTS '+tableName+' (_ref unique, _data)');
    });

    $queryDB.storageEventHandler
    .subscribe('onDropTable', _dbApi.dropTable);

    $queryDB.storageEventHandler.subscribe('onTruncateTable',  _dbApi.delete);


    
    function publicApis(){};

    publicApis.prototype.setItem = function(name,item){
      if(item.tables){
            // remove the table from object
            update(removeTableData(JSON.parse(JSON.stringify(item))));
      }else{
          update(item);
      }


      function update(newSet){
         queryPerfomrer('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)',[name, JSON.stringify(newSet)])
          .then(function(){
              _privateStore[name] = item;
          });
      }
      
    };

    publicApis.prototype.getItem = function(name){
      return _privateStore[name];
    };

    publicApis.prototype.removeItem = function(name){
      queryPerfomrer('DELETE FROM _JELI_STORE_ WHERE _rev=?',[name])
      .then(function(){
        delete _privateStore[name];
      });

      return true;
    };

    publicApis.prototype.usage = function(name){
      return JSON.stringify(this.getItem(name) || '').length;
    };

    publicApis.prototype.clear = function(){
      queryPerfomrer('DELETE FROM _JELI_STORE_',[])
      .then(function(){
        _privateStore[name] = {};
      });
    };


    this.mockLocalStorage = function(){
      // create our store table
      queryPerfomrer('CREATE TABLE IF NOT EXISTS _JELI_STORE_ (_rev unique, _data)', [])
      .then(loadAllData)
      .catch(function(){
        errorBuilder(type+" catched to initialize our store");
      });

      return new publicApis();
    };

    this.useDB = useDB;
}