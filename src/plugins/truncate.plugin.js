 //update -table -records
 //Clause -where -columns -like:expression

 Database.plugins.jQl('truncate', {
     help: ['-truncate -[tbl_name] -flag[[yes] : [no]]'],
     map: {
        table: 1,
        flag: 2
     },
     requiresParam: true,
     fn: truncatePluginFn
 });

 //create -tablename -columns
 function truncatePluginFn(query, handler) {

     return function(db) {
         //@Function Truncate
         //Empties the required table
        var state =  db.table(query.table).truncate(query.flag);
        handler[state.status ? 'onSuccess' : 'onError'](state);
     };
 }