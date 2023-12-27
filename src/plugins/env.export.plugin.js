	//export Plugin
	//Called in oarent environment
	//env -export -type -name -download | print

	Database.plugins.jQl('export', {
	    help: ['-export -[TBL_NAME] -type[(csv , html, jql or json)]  -(d or p) (optional) -[fileName] -[title]'],
		params:{
			type: 'json',
			table: 'all',
			action: 'print',
			fileName: '',
			title: ''
		},
	    requiresParam: true,
	    fn: jExportPluginFn
	});

	function jExportPluginFn(query, handler) {
	    var response = { state: query[0], result: { message: null } };
	    return function(db) {
	        //export a table
	        if (query.length > 2) {
	            try {
	                var expRet = db
	                    .export(query[1], query[2], (query[5]) ? query[5] : "JDB Table Export")
	                    .initialize();

	                if (expRet && !expRet.status) {
	                    var type = 'print';
	                    if (query[3] === 'd') {
	                        type = 'download'
	                    }

	                    response.result.message = expRet[type](query[4]);
	                    return handler.onSuccess.apply(handler.onSuccess, [response]);
	                } else {
	                    return handler.onError.apply(handler.onError, [expRet]);
	                }
	            } catch (e) {
	                response.result.message = "there was an error processing export, please try again later.";
	                return handler.onError(response);
	            }
	        } else {
				response.result.message = "export parameter required";
	            return handler.onError(response);
	        }
	    };
	}