	//export Plugin
	//Called in oarent environment
	//env -export -type -name -download | print

	jEliDB.plugins.jQl('export', {
	    help: ['-export -[TBL_NAME] -type[(csv , html or json)]  -(d or p) (optional) -[fileName]'],
	    requiresParam: true,
	    fn: jExportPluginFn
	});

	function jExportPluginFn(query, handler) {
	    var result = { state: query[0], result: { message: null } };
	    return function(db) {
	        //export a table
	        if (query.length > 2) {
	            try {
	                var expRet = db
	                    .export(query[1], query[2]) //type
	                    .initialize(query[5]);
	                if (expRet && !expRet.state) {
	                    var type = null;
	                    switch (query[3]) {
	                        case ('d'):
	                            type = 'download';
	                            break;
	                        case ('p'):
	                        case ('c'):
	                            type = 'print';
	                            break
	                    }

	                    if (type) {
	                        result.result.message = expRet[type](query[4]);
	                        return handler.onSuccess.apply(handler.onSuccess, [result]);
	                    }
	                }
	            } catch (e) {
	                result.result.message = "there was an error processing export, please try again later.";
	                console.log(e);
	                return handler.onError(result);
	            }

	            return handler.onError.apply(handler.onError, [expRet]);
	        } else {
	            result.result.message = "export parameter required";
	            return handler.onError(result);
	        }
	    };
	}