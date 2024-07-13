Database.plugins.jQl('create', {
    help: ['-create -[tbl_name] [columns]'],
    requiresParam: true,
    fn: createPluginFn
});

//create -tablename -columns
function createPluginFn(query, handler) {
    return function(db) { //create the table
        if (query[1]) {
            return db
                .createTbl(query[1], query[2] || [], null, true)
                .onSuccess(handler.onSuccess)
                .onError(handler.onError);
        }

        // throw error
        handler.onError('Invalid or missing table name');
    };
}