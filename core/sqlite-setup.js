//jEliDB for Sqlite
function sqliteStorage()
{
  //set Prototype
  //create Database
  //Param Object
  //{name: "mySQLite.db", location: 'default'}

  var publicApis = {},
      privateApis = window.sqlitePlugin.openDatabase({name: "jEliDB", location: 'default'}),
      _storageTableName = "",
      _started = false;

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
    
    var _pApis = this.useDB();
    publicApis.setItem = function(name,item){
      _pApis.update(name,{"_storage":item});
    };

    publicApis.getItem = function(name){
      _pApis.select(name)
      .then(function(tx,result){});
    };

    publicApis.removeItem = function(name){
      _pApis.update(name,{"_storage":""});
    };
}