jEliDB.JDB_PLUGINS.jQl('insert', {
    help: ['-insert -[data] -[tbl_name] -replace [true|false]'],
    requiresParam: true,
    fn: insertPluginFn
});

//insert -table name -data
function insertPluginFn(query, handler) {
    var tblName = query[2],
        data = query[1] || [],
        replace = query[3] || false,
        result = false;

    return function(db) {
        //insert into the table
        db
            .transaction(tblName, "writeonly")
            .onSuccess(function(ins) {
                var res = ins.result;
                res
                    .insert.call(res, data, replace)
                    .execute()
                    .onSuccess(handler.onSuccess)
                    .onError(handler.onError);
            })
            .onError(handler.onError)
    }
};