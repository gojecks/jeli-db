
jEliDB.plugins.jQl('create',{
	help : '',
	fn : createPluginFn
});

//create -tablename -columns
function createPluginFn(query,handler){
	var tblName = query[1],
        columns = maskedEval(query[2]) || [],
        result = false;

	return function(db)
	{	    //create the table
	    if(tblName && columns)
	    {
	      db
	      .createTbl(tblName,columns)
	      .onSuccess(handler.onSuccess)
	      .onError(handler.onError);
	    }
	};
}
