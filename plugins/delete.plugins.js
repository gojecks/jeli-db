

jEliDB.plugins.jQl('delete',{
	help : '',
	fn : deletePluginFn
});

//create -tablename -columns
function deletePluginFn(query,handler){
	var table = query[1],
          condition = setCondition(query),
          result = false;

	return function(db)
    {
      if(table && condition)
      {
        db
        .transaction(table,'writeonly')
        .onSuccess(function(del)
        {
          del
          .result
          .delete(condition)
          .execute()
          .onSuccess(handler.onSuccess)
          .onError(handler.onError)
        })
        .onError(handler.onError)
      }

    };
}