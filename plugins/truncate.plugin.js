 //update -table -records
//Clause -where -columns -like:expression

  jEliDB.plugins.jQl('truncate',{
  	help : '',
  	fn : truncatePluginFn
  });

  //create -tablename -columns
  function truncatePluginFn(query,handler){

  	return function(db)
    {
      //@Function Truncate
      //Empties the required table
      var result = false;

        if(query.length > 2)
        {
          db
          .table(query[1])
          .onSuccess(function(trun)
          {
            var flag = simpleBooleanParser(query[2]),
                state = trun.result.truncate(flag);
            if(state.status.success)
            {
              handler.onSuccess(state);
            }else{
              handler.onError(state);
            }
          })
          .onError(handler.onError);
        }

    };
  }
