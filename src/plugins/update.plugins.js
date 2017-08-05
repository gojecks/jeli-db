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
          .update(formatData(), setCondition([].concat.call(query).splice(3)))
          .execute()
          .onSuccess(handler.onSuccess)
          .onError(handler.onError)
        })
        .onError(handler.onError);
    }

    function formatData(){
      var data;
      try{
        data = JSON.parse(query[2])
      }catch(e){
        data = query[2];
      }
      return data;
    }
  }
}