//Cutom Plugins
//Environment Plugin 
	jEliDB.plugins.jQl('api',{
		help : 'api -url -post -data',
		fn : apiPluginFn
	});

		/*
			@api : /set/access/token
			@api : /set/security/nonce
		*/

	function apiPluginFn(query,handler)
	{
		return function(db)
		{
		    var type = query[2],
		    	state = query[1],
		    	postData = maskedEval(query[3]),
		    	table = query[4] || '';

		    db[query[0]](type,state,postData,table)
		    .then(function(res){
		    	handler.onSuccess.apply(handler.onSuccess,[res]);
		    },function(err){
		    	handler.onError.apply(handler.onError,[err]);
		    });

		};
	}