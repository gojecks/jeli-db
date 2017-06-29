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
            var inProduction = $queryDB.getNetworkResolver('inProduction',dbName);
              syncService[inProduction?'put':'push'](tbl,data);
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
      _def = ["insert","update","delete"],
      payload,
      query;

      if(tbl){
        payload = {};
        payload[tbl] = {};
      }

    function pollUpdate()
    {
      var _reqOptions = $queryDB.buildOptions(dbName, null, "update");
          _reqOptions.data.ref = type;
          _reqOptions.data.type = cType;

      var promiseData = {};

      function resolvePromise(_tbl, _data){
        $queryDB
        .$resolveUpdate(dbName, _tbl, _data, true)
        .then(function(cdata)
        {
          $queryDB
          .$taskPerformer
           .updateDB(dbName, _tbl, function(table){
              if(_data.checksum){
                 table.$hash = _data.checksum;
              }
           });

           promiseData[_tbl] = _data;
           
        });
      }


      switch(type){
        case('table'):
          payload[tbl].query = query;
        break;
        case('db'):
          if(!payload){
              $queryDB.getDbTablesNames(dbName).forEach(function(name){
                payload[name] = {};
              });
          }
        break;
      }

      for(var _tbl in payload){
        payload[_tbl].checksum = $queryDB.getTableCheckSum(dbName,_tbl);
      }

      _reqOptions.data.payload = payload;

      ajax( _reqOptions  )
      .done(function(res)
      {
        for(var _tbl in res.data){
          resolvePromise(_tbl, res.data[_tbl]);
        }
        
          
        var _promise = dbSuccessPromiseObject('onUpdate','');
        _promise.result.getData = function(key,tblName){
          return (key && promiseData[tblName || tbl][key || cType])?promiseData[tblName || tbl][key || cType]:[];
        };

        _promise.result.getCheckSum = function(tblName){
            return promiseData[tblName || tbl].checksum;
        };
        _promise.result.getAllUpdates = function(){
          return promiseData;
        };

        _promise.result.getTable = function(tblName){
          return promiseData[tblName || tbl];
        };

        _callback(_promise);
        polling();

      }).fail(function(){
        polling();
      });
    }

    function polling(){
      timerId =  setTimeout(function(){
        pollUpdate();
      },ctimer);
    }
    
   

  return function(fn,timer,ctype,_payload){
    if($isFunction(fn)){
        _callback = fn;
    }
    //start update
    if($queryDB.getNetworkResolver('serviceHost',dbName)){
      ctimer = timer || 1000;
      polling(timer);
      cType = ctype;
      // when 
      if(tbl){
        query = _payload
      }else{
        payload = _payload;
      }
    }

    return ({
      disconnect : function(){
          clearTimeout(timerId);
        }
      });
  };
}