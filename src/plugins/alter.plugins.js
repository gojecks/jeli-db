jEliDB.JDB_PLUGINS.jQl('alter', {
    help: [
        'Alter -[tbl_name] -a -c -columnName [config]',
        'Alter -[tbl_name] -a -p -columnName',
        'Alter -[tbl_name] -a -f -columnName -[relative table]',
        'Alter -[tbl_name] -d -columnName',
        'Alter -[tbl_name] -a -m -[read : write]',
        'Alter -[tbl_name] -a -u -config',
        'ALter -[tbl_name] -r -new_tbl_name'
    ],
    requiresParam: true,
    fn: alterPluginFn
});

//create -tablename -columns
function alterPluginFn(query, handler) {
    // @Function drops the required table
    var result = false,
        taskType = { c: 'column', f: 'foreign', p: 'primary', u: 'unique', m: 'mode' },
        msg = "Table(" + query[1] + ") have been altered.";

    return function(db) {
        if (query.length > 2) {
            //alter the table
            db
                .table(query[1])
                .onSuccess(function(alt) {
                    switch (query[2]) {
                        case ('add'):
                        case ('a'):
                            var task = taskType[query[3]] || query[3];
                            if (alt.result.Alter.add.hasOwnProperty(task)) {
                                alt
                                    .result
                                    .Alter
                                    .add[task](query[4], jSonParser(query[5]));
                            } else {
                                msg = "Unable to find command " + query[3];
                            }
                            break;
                        case ('drop'):
                        case ('d'):
                            alt.result.Alter.drop(query[3]);
                            break;
                        case ('rename'):
                        case ('r'):
                            msg = alt.result.rename(query[3]);
                            break;
                        default:
                            msg = "unable to find command(" + query[2] + ")";
                            break;
                    }

                    handler.onSuccess(dbSuccessPromiseObject("alter", msg));
                })
                .onError(handler.onError);
        }

    };
}