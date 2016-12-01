
		//Synchronization Plugin
		//Task Called with Env

    jEliDB.plugins.jQl('sync',{
		help : '',
		fn : syncPluginFn
	});

    function syncPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
	    return function(db)
	    {
	      db
	      .synchronize()
	      .Entity(query[1])
	      .configSync()
	      .processEntity(handler);
	    };
	}