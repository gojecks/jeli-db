//jEliDB for Sqlite
function sqliteStorage(type, CB)
{
  //set Prototype
  //create Database
  //Param Object
  //{name: "mySQLite.db", location: 'default'}

  var privateApis = null,
      _storageTableName = "",
      _started = false,
      _privateStore = {};

      // intialize our DB
      // (CB || noop)();
  switch((type || '').toLowerCase()){
    case('websql'):
      privateApis = $isSupport.websql && openDatabase('jEliDB', '1.0', 'jEliDB Storage for webSql', 10 * 1024 * 1024);
    break;
    case('sqlite'):
      privateApis = (sqlitePlugin in window) && window.sqlitePlugin.openDatabase({name: "jEliDB", location: 'default'});
    break;
  }

  if(!privateApis){
    errorBuilder('No Plugin Support for '+ type);
  }


      function loadAllData(){
        queryPerfomrer('SELECT * FROM _JELI_STORE_', [])
          .then(function(tx, results){
            var len = results.rows.length, i;
                for (i = 0; i < len; i++){
                   _privateStore[results.rows.item(i)._rev] = JSON.parse(results.rows.item(i)._data);
                }
            // trigger our callback
              (CB || noop)();
          });
      }


      function queryPerfomrer(query, data){
        var $promise = new $p();
        privateApis.transaction(function(tx){
          tx.executeSql(query, data, $promise.resolve, $promise.reject);
        });

        return $promise;
      }

    this.useDB = function(){

       var _pub = {},
          _setData = function(data){
            var col = [],
                val = [];
            for(var i in data){
              col.push(col+"=?");
              val.push(data[i]);
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
            columns = Object.key(data),
            _cData = _setData(data),
            executeQuery = "INSERT INTO "+table+" ("+columns.join(',')+") VALUES ("+_cData.col.join(',')+")";
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, _cData.val,$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.select = function(table){
          if(!table){
            errorBuilder('Table is required');
          }

          var $promise = new $p(),
              executeQuery = 'SELECT * FROM '+table;
          privateApis.transaction(function(transaction){
            transaction.executeSql(executeQuery, [],$promise.resolve,$promise.reject);
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
            transaction.executeSql(executeQuery, ex,$promise.resolve,$promise.reject);
          });

          return $promise;
       };

       _pub.update = function(table,data,where){
          if(!table || !$isObject(data)){
            errorBuilder('Table and data is required');
          }

          var $promise = new $p(),
            executeQuery = "UPDATE "+table,
            _cData = _setData(data);

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

       return _pub;
    };
    
    function publicApis(){};
    publicApis.prototype.setItem = function(name,item){
      queryPerfomrer('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)',[name, JSON.stringify(item)])
      .then(function(){
          _privateStore[name] = item;
      });
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
}