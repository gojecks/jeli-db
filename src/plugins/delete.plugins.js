JDB_PLUGINS.jQl('delete', {
    help: ['-delete -[tbl_name] -[[condition] [like:]] -pushToServer[yes|no]'],
    requiresParam: true,
    fn: deletePluginFn
});

//create -tablename -columns
function deletePluginFn(query, handler) {
    return function(db) {
        if (query[1]) {
            db
                .transaction(query[1], 'writeonly')
                .onSuccess(function(del) {
                    del
                        .result
                        .delete(jSonParser(query[2]))
                        .execute(query[3])
                        .onSuccess(handler.onSuccess)
                        .onError(handler.onError)
                })
                .onError(handler.onError)
        }

    };
}