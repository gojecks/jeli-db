

  jEliDB.plugins.jQl('drop',{
  	help : '',
  	fn : dropPluginFn
  });

  //create -tablename -columns
  function dropPluginFn(query,handler){

  	return function(db)
    {
      // @Function drops the required table
      var result = false;

      if(query.length > 2)
      {
          var flag = simpleBooleanParser(query[3]) || false;
          switch(query[1].toLowerCase())
          {
            case("table"):
            case('tbl'):
            case("t"):
              db
              .table(query[2])
              .onSuccess(function(tbl)
              {
                 var state = tbl.result.drop(flag);
                  if($isEqual(state.status,'success'))
                  {
                    handler.onSuccess(state);
                  }else{
                    handler.onError(state);
                  }
              })
              .onError(handler.onError)
            break;
            case('database'):
            case('db'):
            case('d'):
              db
              .drop(flag)
              .onSuccess(function(state)
              {
                  if($isEqual(state.status,'success'))
                  {
                    handler.onSuccess(state);
                  }else{
                    handler.onError(state);
                  }
              })
              .onError(handler.onError)
            break;
            default:
              var state = {state:"drop",message:query[1] + " command was not found, please type help for JDB command"};
              handler.onError(state);
            break;
          }
      }
    };
  }