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
      _def = ["insert","update","delete"];

    function pollUpdate()
    {
      var _reqOptions = $queryDB.buildOptions(dbName,tbl,"update");
          _reqOptions.data.ref = type;
          _reqOptions.data.type = cType;

      if($isEqual(type,'table')){
        _reqOptions.data.checksum = $queryDB.getTableCheckSum(dbName,tbl);
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