 //update -table -records
 //Clause -where -columns -like:expression

 Database.plugins.jQl('update', {
     help: ['-update -[tbl_name] -[data] -expression[ [where] [like]] -pushToServer[yes|no]'],
     requiresParam: true,
     fn: updatePluginFn
 });

 //create -tablename -columns
 function updatePluginFn(query, handler) {
     return function(db) {
         //updating a table
         if (query.length && query.length > 2) {
             db
                 .transaction(query[1], 'writeonly')
                 .onSuccess(function(upd) {
                     upd
                         .result
                         .update(jSonParser(query[2]), jSonParser(query[3]))
                         .execute(query[4])
                         .onSuccess(handler.onSuccess)
                         .onError(handler.onError)
                 })
                 .onError(handler.onError);
         }
     }
 }