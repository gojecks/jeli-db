 //update -table -records
 //Clause -where -columns -like:expression

 Database.plugins.jQl('truncate', {
     help: ['truncate -[tbl_name] -flag[[yes] : [no]]'],
     schema: {
        table: { position: 1, type: 'string' },
        // not typed: help says "[yes] : [no]" but truncate() just does a
        // truthy check, same reasoning as 'drop's flag field
        flag: { position: 2 }
     },
     requiresParam: true,
     fn: truncatePluginFn
 });

 Database.plugins.jQl('truncate-db', {
    help: ['truncate -dropFromServer[true|false]'],
    schema: {
        dropFromServer: { position: 1, type: 'boolean' },
        db: { const: true }
    },
    requiresParam: false,
    fn: truncatePluginFn
});

 //create -tablename -columns
 function truncatePluginFn(params, handler) {
    return db => {
        if (params.db) {
            db.truncate(params.dropFromServer)
            .then(handler.onSuccess, handler.onError)
        } else {
            var state =  db.table(params.table).truncate(params.flag);
            handler[state.status ? 'onSuccess' : 'onError'](state);
        }
     };
 }