Database.plugins.jQl('delete', {
    help: ['delete -[tbl_name] -[[condition] [LIKE|IN|NOTIN]] -ignoreSync'],
    map: {
        ignoreSync: 3,
        cond: 2,
        table: 1
    },
    requiresParam: true,
    fn: deletePluginFn
});

//create -tablename -columns
function deletePluginFn(query, handler) {
    return function (db) {
        db
            .transaction(query.table, 'writeonly')
            .delete(query.cond)
            .execute(query.ignoreSync)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError);
    };
}