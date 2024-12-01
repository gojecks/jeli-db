//update -table -records
//Clause -where -columns -like:expression

Database.plugins.jQl('update', {
    help: ['-update -[tbl_name] -[data] -condition[[where] [like]] -ignoreSync'],
    map: {
        table: 1,
        data: 2,
        cond: 3,
        ignoreSync: 4
    },
    requiresParam: true,
    fn: updatePluginFn
});

//create -tablename -columns
function updatePluginFn(query, handler) {
    return function (db) {
        db
            .transaction(query.table, 'writeonly')
            .update(query.data, query.cond)
            .execute(query.ignoreSync)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
    }
}