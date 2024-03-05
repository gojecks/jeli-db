//Synchronization Plugin
//Task Called with Env

Database.plugins.jQl('sync', {
    help: ['-sync  (optional) -[tbl_name] -[force]'],
    requiresParam: false,
    fn: syncPluginFn
});

function syncPluginFn(query, handler) {
    return function (db) {
        var connector = db.getConnector('sync-connector', {name: db.name, version: db.version});
        connector
            .Entity(query[1])
            .configSync(null, query[2])
            .processEntity(handler);
    };
}