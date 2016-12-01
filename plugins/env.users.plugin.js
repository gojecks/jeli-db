

	//juser environment Plugin
	jEliDB.plugins.jQl('_users',{
		help : '',
		fn : jUsersPluginFn
	});
	
	function jUsersPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
	    return function(db)
	    {
	      var _dbUsers = db._users();

	        if(_dbUsers && _dbUsers[query[1]] && query.length > 2)
	        {
	          var arg = maskedEval(query[2]);

	          _dbUsers[query[1]](arg)
	          .then(handler.onSuccess,handler.onError);

	        }else
	        {
	          return handler.onError.apply(handler.onError,[dbErrorPromiseObject("Invalid command passed, use -help for help")]);
	        }
	    };
	}