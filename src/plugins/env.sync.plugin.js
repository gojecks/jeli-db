//Synchronization Plugin
//Task Called with Env

Database.plugins.jQl('sync', {
    help: ['sync  (optional) -[tbl_name] -[force] -syncData'],
    requiresParam: false,
    schema: {
        table: { position: 1, type: 'string' },
        force: { position: 2, type: 'boolean' },
        // not typed: shape of sync payload data isn't documented/constrained
        syncData: { position: 3 }
    },
    fn: (query, handler) => db => db.sync(query)
        .then(
            res => handler.onSuccess(res),
            err => handler.onError(err)
        )
});