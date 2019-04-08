jplugins.jQl('insert', {
    help: ['-insert -[data] -[tbl_name]'],
    requiresParam: true,
    fn: insertPluginFn
});

//insert -table name -data
function insertPluginFn(query, handler) {
    var tblName = query[2],
        data = maskedEval(query[1]) || [],
        result = false;

    return function(db) {
        if ($isString(data)) {
            return handler.onError({ state: "insert", message: "Invalid dataType, accepted types are  (ARRAY or OBJECT)" });
        } else if ($isObject(data)) {
            data = [data];
        }

        //insert into the table
        db
            .transaction(tblName, "writeonly")
            .onSuccess(function(ins) {
                var res = ins.result;
                res
                    .insert.apply(res, data)
                    .execute()
                    .onSuccess(handler.onSuccess)
                    .onError(handler.onError);
            })
            .onError(handler.onError)
    }
};