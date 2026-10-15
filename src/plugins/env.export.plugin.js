	//export Plugin
	//Called in oarent environment
	//env -export -type -name -download | print

	Database.plugins.jQl('export', {
	    help: ['-export -[TBL_NAME] -type[(csv , html, jql or json)]  -(d or p) (optional) -[fileName] -[title]'],
	    requiresParam: true,
	    schema: {
	        table: { position: 1, default: 'all', type: 'string' },
	        type: { position: 2, default: 'json', type: 'string' },
	        action: { position: 3, default: 'print', type: 'string' },
	        fileName: { position: 4, default: '', type: 'string' },
	        title: { position: 5, default: '', type: 'string' }
	    },
	    fn: jExportPluginFn
	});

	function jExportPluginFn(query, handler) {
	    const response = { state: query.command, result: { message: null } };
	    return db => {
	        //export a table
	        if (query.table) {
	            try {
	                const expRet = db
	                    .export(query.table, query.type, query.title || "JDB Table Export")
	                    .initialize();

	                if (expRet && !expRet.status) {
	                    let type = 'print';
	                    if (query.action === 'd') {
	                        type = 'download'
	                    }

	                    response.result.message = expRet[type](query.fileName);
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