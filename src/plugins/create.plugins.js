Database.plugins.jQl('create', {
    help: ['-create -[tbl_name] [columns]'],
    requiresParam: true,
    fn: createTablePluginFn
});

//create -tablename -columns
function createTablePluginFn(query, handler) {
    return function(db) { 
        if (query[1]) {
            var response = db.createTbl(query[1], query[2] || [], null, true);
            return handler[!response.errorCode ? 'onSuccess' : 'onError'](response);
        }

        // throw error
        handler.onError('Invalid or missing table name');
    };
}