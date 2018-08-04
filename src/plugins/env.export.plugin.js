	//export Plugin
	//Called in oarent environment
	//env -export -type -name -download | print

	jEliDB.plugins.jQl('export', {
	    help: ['-export -[TBL_NAME] -type[(csv , html, jql or json)]  -(d or p) (optional) -[fileName] -[title]'],
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
	                    .export(query[2], query[1]) //type
	                    // title
	                    .initialize(query[5]);

	                if (expRet && !expRet.status) {
	                    var type = null;
	                    switch (query[3]) {
	                        case ('d'):
	                        case ('download'):
	                            type = 'download';
	                            break;
	                        case ('p'):
	                        case ('c'):
	                        case ('print'):
	                        case ('console'):
	                            type = 'print';
	                            break
	                    }

	                    if (type) {
	                        result.result.message = expRet[type](query[4]);
	                        return handler.onSuccess.apply(handler.onSuccess, [result]);
	                    }
	                } else {
	                    return handler.onError.apply(handler.onError, [expRet]);
	                }
	            } catch (e) {
	                result.result.message = "there was an error processing export, please try again later.";
	                return handler.onError(result);
	            }

	            return handler.onError.apply(handler.onError, [expRet]);
	        } else {
	            result.result.message = "export parameter required";
	            return handler.onError(result);
	        }
	    };
	}