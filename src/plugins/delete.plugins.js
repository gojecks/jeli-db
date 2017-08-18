

jEliDB.plugins.jQl('delete',{
	help : ['-delete -[tbl_name] -expression[[where] -[like:]]'],
	fn : deletePluginFn
});

//create -tablename -columns
function deletePluginFn(query,handler){
	return function(db)
    {
      if(query[1])
      {
        db
        .transaction(query[1],'writeonly')
        .onSuccess(function(del)
        {
          del
          .result
          .delete(query[3])
          .execute(query[4])
          .onSuccess(handler.onSuccess)
          .onError(handler.onError)
        })
        .onError(handler.onError)
      }

    };
}