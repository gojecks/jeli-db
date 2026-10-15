Database.plugins.jQl('delete', {
    help: ['delete -[tbl_name] -[[condition] [LIKE|IN|NOTIN]] -ignoreSync -rollbackOnError'],
    schema: {
        table: { position: 1, type: 'string' },
        cond: { position: 2 },
        ignoreSync: { position: 3, type: 'boolean' },
        rollbackOnError: { flag: true }
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
            .execute(query.ignoreSync, false, query.rollbackOnError)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError);
    };
}