 //update -table -records
//Clause -where -columns -like:expression

jEliDB.plugins.jQl('update',{
	help : ['-update -[tbl_name] [data] -expression[ [where] [like]]'],
	fn : updatePluginFn
});

//create -tablename -columns
function updatePluginFn(query,handler){
  var spltQuery = query
	return function(db)
  {
    //updating a table
    var result = false;
    if(query.length && query.length > 2)
    {
        db
        .transaction(query[1],'writeonly')
        .onSuccess(function(upd)
        {
          upd
          .result
          .update(query[2], setCondition(query.concat()))
          .execute()
          .onSuccess(handler.onSuccess)
          .onError(handler.onError)
        })
        .onError(handler.onError);
    }
  }
}