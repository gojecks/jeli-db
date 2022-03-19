//Synchronization Plugin
//Task Called with Env

Database.plugins.jQl('sync', {
    help: ['-sync  (optional) -[tbl_name] -[force]'],
    requiresParam: false,
    fn: syncPluginFn
});

function syncPluginFn(query, handler) {
    return function(db) {
        db
            .synchronize()
            .Entity(query[1])
            .configSync(null, query[2])
            .processEntity(handler);
    };
}