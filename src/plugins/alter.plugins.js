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
    fn: alterPluginFn
});

//create -tablename -columns
function alterPluginFn(query, handler) {
    // @Function drops the required table
    var msg = "Table(" + query[1] + ") have been altered.";
    var actions = {
        a: function(instance) {
            var taskType = { c: 'column', f: 'foreign', p: 'primary', i: 'index', m: 'mode' };
            var task = taskType[query[3]] || query[3];
            if (instance.alter.add[task]) {
                instance.alter.add[task](query[4], query[5]);
            } else {
                msg = "Unable to find command " + query[3];
            }
        },
        d: function(instance) {
            instance.alter.drop(query[3]);
        },
        r: function(instance) {
            msg = instance.rename(query[3]);
        },
        u: function(instance) {
            instance.update(query[3]);
        }
    };

    return function(db) {
        if (query.length > 2) {
            var noop = function() { msg = "unable to find command(" + query[2] + ")"; };
            //alter the table
            db
                .table(query[1])
                .onSuccess(function(dbResponse) {
                    (actions[query[2]] || noop)(dbResponse.result);
                    handler.onSuccess(dbSuccessPromiseObject("alter", msg));
                })
                .onError(handler.onError);
        }
    };
}