//Synchronization Plugin
//Task Called with Env

Database.plugins.jQl('sync', {
    help: ['sync  (optional) -[tbl_name] -[force] -syncData'],
    requiresParam: false,
    map: {
        syncData: 3,
        table: 1,
        force: 2
    },
    fn: syncPluginFn
});

function syncPluginFn(query, handler) {
    return function (db) {
        db.sync(query)
            .then(
                res => handler.onSuccess(res),
                err => handler.onError(err)
            );
    };
}