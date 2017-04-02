
	//Help Plugin
	//Initialized in Env	

	jEliDB.plugins.jQl('help',{
		help : '-help',
		fn : helperPluginFn
	});

	    //@Function generates help list
	function helperPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
	    return function(db)
	    {
	      var helpers = db.jDBHelpers.get().concat();
	      	for(var plugin in customPlugins._content){
	      		helpers = helpers.concat(customPlugins._content[plugin].help);
	      	}

	        result.result.message = helpers;
	        return handler.onSuccess.apply(handler.onSuccess,[result]);
	    };
	}