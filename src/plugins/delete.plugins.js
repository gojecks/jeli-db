Database.plugins.jQl('delete', {
    help: ['delete -[tbl_name] -[[condition] [LIKE|IN|NOTIN]] -pushToServer[yes|no]'],
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
                        .delete(query[2])
                        .execute(query[3])
                        .then(handler.onSuccess, handler.onError)
                        .catch(handler.onError)
                })
                .onError(handler.onError)
        }

    };
}