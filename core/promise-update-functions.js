  //SqlResult extender
  function sqlResultExtender( ret,objStore )
  {
      if($isObject(ret))
      {
        switch(ret.state)
        {
          case('select'):
            ret.jDBNumRows = function()
            {
              return objStore.length;
            };
            ret.getRow = function(row)
            {
              return objStore[row];
            };
            ret.getResult = function()
            {
              return objStore;
            }
            ret.first = function()
            {
              return objStore[0];
            };
            ret.openCursor = function(fn)
            {
                var start = 0,
                    cursorEvent = ({
                      result:{
                        value : [],
                        continue:function()
                        {
                            //increment the start cursor point
                            if(objStore.length > start)
                            {
                              cursorEvent.result.value = objStore[start];
                              start++;
                              fn(cursorEvent);
                            }
                            
                            fn(null);
                        },
                        prev : function()
                        {
                            //decrement the start point
                            if(start)
                            {
                              start--;
                            }

                            this.continue();
                        },
                        index : function()
                        {
                          return start;
                        }
                      }
                    });

                //initialize the cursor event
                fn(cursorEvent.continue);
            };
            ret.limit = function(start,end)
            {
                return copy(objStore).splice(start,end);
            };
          break;
          case('insert'):
            ret.lastInsertId = function()
            {
              return tableInfo.lastInsertId;
            };
            ret.result = objStore;
          break;
          default : 
            ret.result = objStore;
          break;
        }
      }

      return ret;
  } 

function dbSuccessPromiseObject(state,message)
{
  return ({state:state,status:"success",result:{message:message},code:200});
}

function dbErrorPromiseObject(message)
{
  return ({message:message,status:"error",code:400});
}

//DB Promise
function DBPromise(defer,upgradeneeded)
{
  if(defer)
  {
    function resolve(fn,type){
        defer[type](fn);
    }
      //onSuccess State
      this.onSuccess = function(fn)
      {
        //set the defer state
        resolve(fn,'done');

        return this;
      };

      this.onError = function(fn)
      {
        //set the error state
        resolve(fn,'fail');

        return this;
      };

      this.then = function(done,fail){
        resolve(done,'done');
        resolve(fail,'fail');
      };

  }
}

//Live processor Fn
function liveProcessor(tbl,dbName)
{
  var syncService = new jEliDBSynchronization(dbName)
                    .Entity()
                    .configSync({});

  var self = this;
  return function(type)
  {
     if($queryDB.getNetworkResolver('live',dbName))
     {
        var data = $queryDB.$getActiveDB(dbName).$get('recordResolvers').$get(tbl);
          //process the request
          //Synchronize PUT STATE
          if(expect(['update','insert','delete']).contains(type))
          {
              syncService
              .put(tbl,data);
          }
            
     }
  };
}

//jDB update Function 
function jDBStartUpdate(type,dbName,tbl,$hash){
  var _callback  = function(){},
      timerId,
      ctimer,
      cType,
      _def = ["insert","update","delete"];

    function pollUpdate()
    {
      var _reqOptions = $queryDB.buildOptions(dbName,tbl,"update");
          _reqOptions.data.ref = type;
          _reqOptions.data.type = cType;

      if($isEqual(type,'table')){
        _reqOptions.data.checksum = $queryDB.DB.getTableCheckSum(dbName,tbl);
      }

      ajax( _reqOptions  )
      .done(function(res)
      {
        $queryDB
        .DB
        .$resolveUpdate(dbName,tbl,res.data,true)
        .then(function(_data)
        {
          $queryDB
          .$taskPerformer
           .localStorage
           .updateDB(dbName,tbl,function(table){
              if(res.data.checksum){
                 table.$hash = res.data.checksum;
              }
           });

           var retData;
           if(cType){
              retData = _data[cType];
           }else{
              retData = _data;
           }
            
            var _promise = dbSuccessPromiseObject('onUpdate','');
              _promise.result.getData = function(key){
                return (key && retData[key])?retData[key]:[];
              };
              _promise.result.getCheckSum = function(){
                  return res.data.checksum;
              };
              _promise.result.getAllUpdates = function(){
                return retData;
              };

            _callback(_promise);
            polling();
        });

      }).fail(function(){
        polling();
      });
    }

    function polling(){
      timerId =  setTimeout(function(){
        pollUpdate();
      },ctimer);
    }
    
   

  return function(fn,timer,ctype){
    if($isFunction(fn)){
        _callback = fn;
    }
    //start update
    if($queryDB.getNetworkResolver('serviceHost',dbName)){
      ctimer = timer || 1000;
      polling(timer);
      cType = ctype;
    }

    return ({
      disconnect : function(){
          clearTimeout(timerId);
        }
      });
  };
}