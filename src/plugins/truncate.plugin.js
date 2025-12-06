 //update -table -records
 //Clause -where -columns -like:expression

 Database.plugins.jQl('truncate', {
     help: ['truncate -[tbl_name] -flag[[yes] : [no]]'],
     map: {
        table: 1,
        flag: 2
     },
     requiresParam: true,
     fn: truncatePluginFn
 });

 Database.plugins.jQl('truncate-db', {
    help: ['truncate -dropFromServer[true|false]'],
    map: {
        dropFromServer: 1,
        db: true
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