
	jEliDB.plugins.jQl('insert',{
		help : '',
		fn : insertPluginFn
	});

	//insert -table name -data
	function insertPluginFn(query,handler)
	{
		var tblName = query[2],
	        data = maskedEval(query[1]) || [],
	        result = false;

		return function(db){

		    //insert into the table
		    db
		    .transaction(tblName,"writeonly")
		    .onSuccess(function(ins)
		    {
		        var res = ins.result;
		      res
		      .insert.apply(res,data)
		      .execute()
		      .onSuccess(handler.onSuccess)
		      .onError(handler.onError);
		    })
		    .onError(handler.onError)
		}
	};