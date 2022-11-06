Database.plugins.jQl('drop', {
    help: ['-drop [-t or -d] -[tbl_name] -flag[ [yes] or [no] ] -localOnly'],
    requiresParam: true,
    fn: dropPluginFn
});

/**
 * core drop plugins
 * @param {*} query 
 * @param {*} handler 
 */
function dropPluginFn(query, handler) {

    return function(db) {
        // @Function drops the required table
        var errMsg = { state: "drop", message: query[1] + " command was not found, please type help for JDB command" };

        if (query.length > 2) {
            var flag = query[3] || false;
            switch (query[1].charAt(0)) {
                case ("t"):
                    db
                        .table(query[2])
                        .onSuccess(function(tbl) {
                            var state = tbl.result.drop(flag);
                            state.type = "table";
                            if (isequal(state.status, 'success')) {
                                handler.onSuccess(state);
                            } else {
                                handler.onError(state);
                            }
                        })
                        .onError(handler.onError)
                    break;
                case ('d'):
                    db.drop(flag, query[2], query[4])
                        .onSuccess(function(state) {
                            state.type = query[1];
                            if (isequal(state.status, 'success')) {
                                handler.onSuccess(state);
                            } else {
                                handler.onError(state);
                            }
                        })
                        .onError(handler.onError)
                    break;
                default:
                    handler.onError(errMsg);
                    break;
            }
        } else {
            handler.onError(errMsg)
        }
    };
}