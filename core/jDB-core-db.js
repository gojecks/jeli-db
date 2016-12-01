/** DataBase Prototype **/


    //jEliDB Events
    function DBEvent(name,version,required)
    {
        //set the DB name for reference
        this.name = name;
        this.version = version;
        this.env = {
            usage : function()
            {
              if(name && $queryDB.DB.hasOwnProperty(name))
              {
                  return (((name.length + $localStorage[name].length) * 2) / 1024).toFixed(2)+" KB";
              }

              return  "unknown usuage";
            },
            logger : function()
            {
              var data = $queryDB.$getActiveDB(name).$get('resourceManager').getResource();

              return (data);
            },
            //@Function Name getApiKey
            //Objective : get the current user APIKEY from the server
            //only when its available
            appkey : function()
            {
              var _options = $queryDB.buildOptions(name,'','apikey'),
                  $defer = new $p(),
                  logService = $queryDB.getNetworkResolver('logService');
                  _options.type = "POST";

              logService('Retrieving Api Key and Secret..');
                //perform ajax call
                ajax( _options )
                .then(function(res)
                {
                  logService('Completed without errors..');
                  $defer.resolve(res.data);
                  //empty our local recordResolver
                },function(res)
                {
                  logService('Completed with error..');
                  $defer.reject(res.data.error);
                });

                return $defer; 
            }
        };

             //add event listener to db
        this.onUpdate = jDBStartUpdate('db',name,null);

       if(required && $isArray(required)){
          var ret = {},
              self = this;
          required.filter(function(name){
            ret[name] = self[name];
          });

          return ret;
        }
    }

    /** Create DBEVENT Prototype **/
   	DBEvent.prototype.createTbl = function(name,columns)
  	{
          var defer = new $d(),
              result = {state:"create"};
            if(name && !$queryDB.DB.$getTable(this.name,name))
            {
              //pardon wrong columns format
                if($isObject(columns))
                {
                  var nColumn = [];
                      nColumn.push( columns );

                    columns = nColumn;
                    //empty column
                    nColumn = null;
                }

              var DB_NAME = this.name,
                  curTime = +new Date;
              $queryDB.DB.$newTable(this.name,name,({
                columns : columns || [{}],
                data : [],
                DB_NAME : DB_NAME,
                TBL_NAME : name,
                "primaryKey": null,
                "foreignKey" : null,
                lastInsertId : 0,
                allowedMode :{ readwrite : 1, readonly: 1 },
                created : curTime,
                lastModified : curTime,
                $hash : GUID(),
                _$:1 //created locally
              }));

                  $queryDB.stack.push(function()
                  {
                    $queryDB.$taskPerformer.localStorage.updateDB(DB_NAME,name);
                  });

              //set the result
              result.result = new jEliDBTBL($queryDB.DB.$getTable(DB_NAME,name));
              result.result.message = 'Table('+name+') created successfully';

              defer.resolve(result);
            }else
            {
              result.message = (name)?'Table('+name+') already exist':'Table name is required';
              result.errorCode = 402;
              //reject the process
              defer.reject(result);
            }

          return new DBPromise(defer);
    };


      DBEvent.prototype.table = function(name,mode)
      {
        var defer = new $d();
          //get the requested table
          if(name && $queryDB.DB.$getTable(this.name,name))
          {
             defer.resolve({result:new jEliDBTBL($queryDB.DB.$getTable(this.name,name), mode) });
          }else
          {
              defer.reject({message:"There was an error, Table ("+name+") was not found on this DB ("+this.name+")",errorCode:401})
          }

          return new DBPromise(defer);
      };

      //condition setter
      function setCondition(spltQuery)
      {
          return spltQuery.slice( parseInt(spltQuery.indexOf("where") + 1) ).join(' ');
      }

      //query string performer
      DBEvent.prototype.jQl = function(query,handler)
      {
        var taskType = $remArrayWhiteSpace(query.split(/(?:-)/gi),$remLastWhiteSpace),
            taskPerformerObj = customPlugins.$getAll(),
            task = taskType[0].toLowerCase();

            if(taskType && taskPerformerObj[task])
            {
              return taskPerformerObj[task].fn(taskType,handler)(this);
            }

          return handler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
      };

      DBEvent.prototype['export'] = function(type)
      {
          var type = type || 'csv',
              exp = new jExport(type);


          //getValue
          function getValueInArray(data)
          {
            var ret = []
            for(var key in data)
            {
              ret.push(data[key]);
            }

            return ret;
          }

            return (
            {
              initialize : function(data,title)
              {
                  //Parse the data of its not an OBJECT
                if(!data)
                {
                  return dbSuccessPromiseObject("export","unable to export data, invalid table data")
                }

                //if export type was a JSON format
                if($isEqual(type,'json'))
                {
                  //put the json data
                  exp.put(data);
                }else
                {
                    //Open the exporter
                    exp.open(title);
                    //set label
                    exp.row(Object.keys(data[0]._data));
                    //set the data
                    findInList.call(data,function(i,n)
                    {
                     exp.row( getValueInArray(n._data) );
                    });
                }

                //close the exporter
                return exp.close();
            }
          });
      };

      DBEvent.prototype.import = function(table,handler)
      {
        var createTable = false,
            db = this,
            _def = ({
              logService : function(msg){
                errorBuilder(msg)
              },
              onSelect : function(){},
              onSuccess : function(){},
              onError : function(){}
            });

            //check if handler
            handler = handler || _def;
          if(table && $isString(table))
          {
            if(!$queryDB.DB.$getTable(this.name,table))
            {

              if(handler.logService)
              {
                handler.logService('Table('+table+') was not found!!');
                createTable = true;
              }
            }
          }else
          {
            handler.logService('Table is required');
            return false;
          }

          function importHandler()
          {
	            //@Fn insertData
	            function insertData(data)
	            {
                //DB Transaction
                //Write Data to TABLE
	              db.transaction(table,'writeonly')
                .onSuccess(function(res)
                {

                  res
                  .result
                  .insert.apply(res.result,data)
                  .execute()
                  .onSuccess(function(ins)
                  {
                    handler.logService(ins.result.message);
                  })
                  .onError(function(ins)
                  {
                    handler.logService(ins.message);
                  });
                })
                .onError(function(ins)
                {
                  hanler.logService(ins.message);
                });
	            }

	            function checkColumns(col,cData)
	            {
	                //column checker
	                if(col.length)
	                {
	                  db.table(table)
	                  .onSuccess(function(res)
	                  {
	                    var tblFn = res.result,
	                        cols = tblFn.columns;
	                      //loop through col
	                      for(var c in col)
	                      {
	                        if(!cols[col[c]])
	                        {
	                          tblFn.Alter.add('new').column(col[c],{type:typeof cData[col[c]]});
	                        }
	                      }
	                  });
	                }
	            }

	            this.onSuccess = function(data)
	            {
	                handler.logService('Imported '+data.data.length +" records");
	                if(data.skippedData.length)
	                {
	                  handler.logService('Skipped '+data.skippedData.length +" records");
	                }

	                if(createTable)
	                {
	                  handler.logService('Creating table: '+ table);
	                  var tblColumns = data.columns,
	                      config = {};

	                  for(var col in tblColumns)
	                  {
	                    config[tblColumns[col]] = {type:(typeof data.data[0][tblColumns[col]])};
	                  }

	                  //create the table
	                  db
	                  .createTbl(table,config)
	                  .onSuccess(function(res)
	                  {
	                    handler.logService(res.result.message);
	                    insertData(data.data);
	                  })
	                  .onError(function(res)
	                  {
	                    handler.logService(res.message)
	                  })
	                }else
	                {
	                  //insert the data into the data
	                  checkColumns(data.columns,data.data[0]);
	                  insertData(data.data);
	                }

	                if(handler.onSuccess)
	                {
	                  handler.onSuccess(dbSuccessPromiseObject('import',"Completed without errors"));
	                }
	            };

	            this.onError = function(err)
	            {
	              handler.logService(err);
	              handler.onError(dbErrorPromiseObject("Completed with errors"));
	            };

	            if(handler.onselect)
	            {
	              this.onselect = handler.onselect;
	            }
          }

          return new jFileReader().start(new importHandler());
      };

        //DB helper
        function jCMDHelpers()
        {
            var list = [];
            //env
            this.add = function(help)
            {
                list.push(help);
            };

            this.get = function()
            {
              return list;
            };

            this.overwrite = function(helps)
            {
                if($isArray(helps) && helps.length)
                {
                  list = helps;
                }
            };
        }

      DBEvent.prototype.jDBHelpers =  new jCMDHelpers();

      DBEvent.prototype.list_tables = function()
      {
          var tableSet = {},
              _db = $queryDB.DB[this.name];
          if(_db)
          {
            findInList.call(_db.tables,function(tblName,tbl)
            {
                tableSet[tblName] = {
                  records : (tbl.data || []).length,
                  columns : tbl.columns,
                  primaryKey : tbl.primaryKey,
                  foreignKey : tbl.foreignKey,
                  allowedMode : 'readwrite'
                };
            });
          }
          
          return tableSet;
      };

      DBEvent.prototype.synchronize = function()
      {
        return new jEliDBSynchronization(this.name);
      };

      //Query DB
      DBEvent.prototype.transaction = function(table,mode)
      {
        var dbName = this.name;
	        //getRequired Table Fn
	        function getRequiredTable(cTable)
	        {
	          if($queryDB.DB.$getTable(dbName,cTable))
	          {
	            return $queryDB.DB.$getTable(dbName,cTable);
	          }else
	          {
	              err.push("There was an error, Table ("+table+") was not found on this DB ("+dbName+")");
	          }
	        }

	        // create a new defer state
	        var defer = new $d();
	        if(table)
	        {
	            var tableData = null,
	                $self = this,
	                err = [],
	                isMultipleTable = false;

	            //require table is an array
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
	            }
	              

	            if(err.length)
	            {
	              defer.reject({message:err.join("\n"),errorCode:401});
	            }else
	            {
	              defer.resolve({result :  new jTblQuery(tableData,mode,isMultipleTable),tables:table,mode:mode });
	            }
	        }

	        return new DBPromise( defer );
      };

      //add users
      DBEvent.prototype._users = function()
      {

        var syncService = new jEliDBSynchronization(this.name)
                          .Entity()
                          .configSync({}),
            _secure = '_users',
            $promise = new $d(),
            db = this,
            $defer = new DBPromise( $promise ); 

          //Add user
          function addUser(uInfo)
          {
              if($isObject(uInfo))
              {
                var _default = ({time:(+new Date),access:"*",_ref:GUID()}),
                    _newInfo = extend({},_default,uInfo),
                  //Put the Data
                  postData = {data:{insert:[_newInfo]}};
                  //use the db API Method
                  db.api('POST','/create/user',postData,_secure)
                  .then(function(res)
                  {
                      //Put the new user
                      var ret = dbSuccessPromiseObject('createUser', "User Created successfully");
                      //if direct login after login
                      //set the getUserInfo and getAccessToken
                      if(res.result.access_info)
                      {
                          ret.result.getUserInfo = function(){
                          return res.result._rec[0];
                        };
                        ret.result.getAccessToken = function(){
                          return res.result.access_info;
                        };

                        ret.getResponseData = function(){
                          return res.result;
                        };

                      }else{
                        ret.result.data = res.result;
                      }

                      if(res.result.ok)
                      {
                        $promise.resolve(ret);
                      }else{
                        $promise.reject(dbErrorPromiseObject('Failed to register User'));
                      }
                  },function()
                  {
                      $promise.reject(dbErrorPromiseObject('Failed to register User'));
                  });

              }

              return $defer;
          }

          //removeUser
          function removeUser(uInfo)
          {
              if($isObject(uInfo))
              {
                  syncService
                  .delete(_secure,[uInfo])
                  .then(function(res)
                  {
                      $promise.resolve(dbSuccessPromiseObject('removeUser', "User removed successfully"));
                  },function()
                  {
                      $promise.reject(dbErrorPromiseObject('Failed to remove User'))
                  });
              }

              return $defer;
          }


          //updateUsers 
          function updateUser(userData)
          {
            if(userData)
            {
                //post our request to server
                db.api('POST','/update/user',{data:{update:[userData]}},_secure)
                .then(function(res){
                    res.state = "updateUser";
                    res.result.message = "User Updated successfully";
                    $promise.resolve(res);
                },function(){
                  $promise.reject(dbErrorPromiseObject('Failed to update User, please try again later'))
                });
            }

              return $defer;
          }


          //getUser
          function getUsers(queryData)
          {
            var postData = {param:queryData,limit:"JDB_SINGLE"};
            //post our request to server
            db.api('POST','/authorize/user',postData,_secure)
            .then(function(res)
            {
                var ret = dbSuccessPromiseObject('authorize', ""),
                    isAuthorized = res.result._rec.length;
                    ret.result.getUserInfo = function(){
                      return res.result._rec[0];
                    };
                    ret.result.getAccessToken = function(){
                      return res.result.access_info;
                    };
                //resolve the promise
                if(!isAuthorized){
                 $promise.reject(dbErrorPromiseObject('Unable to log user in'))
                }else{
                  $promise.resolve( ret );
                }

            },function(){
                $promise.reject(dbErrorPromiseObject('Unable to log user in'));
            });

            return $defer;

          }

          return ({
              add : addUser,
              remove : removeUser,
              authorize : getUsers,
              updateUser : updateUser
          });
      };

      //Drop Db
      DBEvent.prototype.drop = function(flag)
      {
        var defer = new $d();
          if(flag)
          {
            defer.resolve($queryDB.DB.removeDB(this.name));
          }else
          {
            defer.reject({message:"Unable to drop DB, either invalid flag or no priviledge granted!!",errorCode:401});
          }

          return new DBPromise( defer );
      };

      //replicate DB
      DBEvent.prototype.replicate = function()
      {
          var defer = new $d();

          return new DBPromise( defer );
      };

      DBEvent.prototype.close = function(flag){
        //drop the DB if allowed
        $queryDB.DB.closeDB(this.name,flag);
      };

    //api AJAX request
    //@params : request Type , State , postData, table_name
    //
    DBEvent.prototype.api = function(type,state,postData,tbl){
        //state needs to be split for accuracy
        if(expect(state).contains("/")){
          state = state.split("/");
          //remove the first slash
          state.shift();
          state = camelCase.call(state.join('-'));
        }


      var _options = $queryDB.buildOptions(this.name,tbl,state),
          $defer = new $p();
          _options.type = type || 'GET';
          if(postData){
            _options.data.postData = postData;
          }
      
        ajax(_options)
        .then(function(res){
          var ret = dbSuccessPromiseObject('api', "");
              ret.result = res.data;
            $defer.resolve(ret);
        },function(err)
        {
          $defer.reject(err.data.error);
        });

        return $defer;
    };
