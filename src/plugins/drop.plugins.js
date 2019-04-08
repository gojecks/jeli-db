jplugins.jQl('drop', {
    help: ['-drop [-t or -d] -[tbl_name] -flag[ [yes] or [no] ]'],
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
        var result = false,
            errMsg = { state: "drop", message: query[1] + " command was not found, please type help for JDB command" };

        if (query.length > 2) {
            var flag = simpleBooleanParser(query[3]) || false;
            switch (query[1].toLowerCase()) {
                case ("table"):
                case ('tbl'):
                case ("t"):
                    db
                        .table(query[2])
                        .onSuccess(function(tbl) {
                            var state = tbl.result.drop(flag);
                            state.type = "table";
                            if ($isEqual(state.status, 'success')) {
                                handler.onSuccess(state);
                            } else {
                                handler.onError(state);
                            }
                        })
                        .onError(handler.onError)
                    break;
                case ('database'):
                case ('db'):
                case ('d'):
                    db
                        .drop(flag)
                        .onSuccess(function(state) {
                            state.type = "database";
                            if ($isEqual(state.status, 'success')) {
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