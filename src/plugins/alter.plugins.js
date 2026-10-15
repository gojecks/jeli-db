Database.plugins.jQl('alter', {
    help: [
        'alter -[tbl_name] -a -c -columnName [config]',
        'alter -[tbl_name] -a -p -columnName',
        'alter -[tbl_name] -a -f -columnName -[relative table]',
        'alter -[tbl_name] -d -columnName',
        'alter -[tbl_name] -a -m -[read : write]',
        'alter -[tbl_name] -a -i -config',
        'alter -[tbl_name] -u -config',
        'alter -[tbl_name] -r -new_tbl_name'
    ],
    requiresParam: true,
    schema: {
        table: { position: 1, type: 'string' },
        action: { position: 2, type: 'string' },
        // everything after -[action] is action-specific (sub-action/column
        // name/relative table/new name/...), kept raw (unparsed) exactly as
        // typed since the actions below index into it positionally
        args: { position: 3, rest: true, raw: true }
    },
    fn: alterPluginFn
});

//create -tablename -columns
function alterPluginFn(query, handler) {
    // @Function drops the required table
    var msg = "Table(" + query.table + ") have been altered.";
    var actions = {
        a: instance => {
            var taskType = { c: 'column', f: 'foreign', p: 'primary', i: 'index', m: 'mode' };
            var task = taskType[query.args[0]] || query.args[0];
            if (instance.alter.add[task]) {
                instance.alter.add[task](query.args[1], query.args[2]);
            } else {
                msg = "Unable to find command " + query.args[0];
            }
        },
        d: instance => instance.alter.drop(query.args[0]),
        r: instance => msg = instance.rename(query.args[0]),
        u: instance => instance.update(query.args[0])
    };

    return function (db) {
        if (query.action) {
            var noop = function () { msg = "unable to find command(" + query.action + ")"; };
            //alter the table
            var tableInstance = db.table(query.table);
            (actions[query.action] || noop)(tableInstance);
            handler.onSuccess(dbSuccessPromiseObject("alter", msg));
        }
    };
}