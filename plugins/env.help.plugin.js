
	//Help Plugin
	//Initialized in Env	

	jEliDB.plugins.jQl('help',{
		help : '',
		fn : helperPluginFn
	});

	    //@Function generates help list
	function helperPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
	    return function(db)
	    {
	      var helpers = db.jDBHelpers;
	        result.result.message = helpers.get();
	        return handler.onSuccess.apply(handler.onSuccess,[result]);
	    };
	}