JDB_PLUGINS.jQl('create', {
    help: ['-create -[tbl_name] [columns]'],
    requiresParam: true,
    fn: createPluginFn
});

//create -tablename -columns
function createPluginFn(query, handler) {
    var tblName = query[1],
        columns = query[2] || [],
        result = false;

    return function(db) { //create the table
        if (tblName && columns) {
            db
                .createTbl(tblName, columns)
                .onSuccess(handler.onSuccess)
                .onError(handler.onError);
        }
    };
}