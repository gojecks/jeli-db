//update -table -records
//Clause -where -columns -like:expression

Database.plugins.jQl('update', {
    help: ['-update -[tbl_name] -[data] -expression[ [where] [like]] -pushToServer[yes|no]'],
    requiresParam: true,
    fn: updatePluginFn
});

//create -tablename -columns
function updatePluginFn(query, handler) {
    return function (db) {
        //updating a table
        if (query.length && query.length > 2) {
            db
                .transaction(query[1], 'writeonly')
                .onSuccess(function (upd) {
                    upd
                        .result
                        .update(query[2], query[3])
                        .execute(query[4])
                        .then(handler.onSuccess, handler.onError)
                        .catch(handler.onError)
                })
                .onError(handler.onError);
            return;
        }
        handler.onError({ message: 'Unable to run query' });
    }
}