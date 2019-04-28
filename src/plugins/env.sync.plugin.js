//Synchronization Plugin
//Task Called with Env

JDB_PLUGINS.jQl('sync', {
    help: ['-sync  (optional) -[tbl_name] -[force]'],
    requiresParam: false,
    fn: syncPluginFn
});

function syncPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        db
            .synchronize()
            .Entity(query[1])
            .configSync(null, query[2])
            .processEntity(handler);
    };
}