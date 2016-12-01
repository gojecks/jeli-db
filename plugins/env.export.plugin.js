	
	//export Plugin
	//Called in oarent environment
	//env -export -type -name -download | print

	jEliDB.plugins.jQl('export',{
		help : '',
		fn : jExportPluginFn
	});

	function jExportPluginFn(query,handler)
	{
		var result = {state:query[0],result:{message:null}};
	    return function(db)
	    {
	        //export a table
		      if(query.length > 2)
		      {
		        var expRet = db
		                    .export(query[2])//type
		                    .initialize($queryDB.DB.$getTable( db.name , query[1]).data, query[5]);
		        if(expRet && !expRet.state)
		        {
		            var type = null;
		              switch(query[3])
		              {
		                case('d'):
		                  type= 'download';
		                break;
		                case('p'):
		                case('c'):
		                  type = 'print';
		                break
		              }

		            if(type)
		            {
		              result.result.message = expRet[type](query[4]);
		              return handler.onSuccess.apply(handler.onSuccess,[result]);
		            }
		        }

		        return handler.onError.apply(handler.onError,[expRet]);
		      }
	    };
	}