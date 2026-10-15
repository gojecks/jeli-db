Database.plugins.jQl('create', {
    help: ['-create -[tbl_name] [columns]'],
    requiresParam: true,
    schema: {
        table: { position: 1, type: 'string' },
        columns: { position: 2, type: 'array' }
    },
    fn: createTablePluginFn
});

//create -tablename -columns
function createTablePluginFn(query, handler) {
    return function(db) {
        if (query.table) {
            var response = db.createTbl(query.table, query.columns || [], null, true);
            return handler[!response.errorCode ? 'onSuccess' : 'onError'](response);
        }

        // throw error
        handler.onError('Invalid or missing table name');
    };
}