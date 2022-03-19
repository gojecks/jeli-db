 //update -table -records
 //Clause -where -columns -like:expression

 Database.plugins.jQl('truncate', {
     help: ['-truncate -[tbl_name] -flag[[yes] : [no]]'],
     requiresParam: true,
     fn: truncatePluginFn
 });

 //create -tablename -columns
 function truncatePluginFn(query, handler) {

     return function(db) {
         //@Function Truncate
         //Empties the required table
         if (query.length > 2) {
             db
                 .table(query[1])
                 .onSuccess(function(trun) {
                     var flag = query[2],
                         state = trun.result.truncate(flag);
                     if (state.status) {
                         handler.onSuccess(state);
                     } else {
                         handler.onError(state);
                     }
                 })
                 .onError(handler.onError);
         }

     };
 }