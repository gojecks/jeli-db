//Cutom Plugins
//Environment Plugin 
	jEliDB.plugins.jQl('env',{
		help : '',
		fn : envPluginFn
	});


	function envPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
		return function(db)
		{
		      var task = db.env[query[1]];
		      if(task)
		      {
		          var ret = task();
		          if($isObject(ret))
		          {
		            result.state = query[1];
		            ret.then(function(res){
		              //set the state
		              result.result.message = res;
		              handler.onSuccess.apply(handler.onSuccess,[result]);
		            },function(err){
		              handler.onError.apply(handler.onError,[err]);
		            })
		            return true;
		          }else{
		            result.result.message = ret;
		            return handler.onSuccess.apply(handler.onSuccess,[result]);
		          }
		        
		      }

		      return handler.onError.apply(handler.onError,[dbErrorPromiseObject("Invalid command passed, use -help for help")]);
		};
	}












