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
        var successCallback = function(state, type){
            state.type  = type;
            if (isequal(state.status, 'success')) {
                handler.onSuccess(state);
            } else {
                handler.onError(state);
            }
        };

        if (query.length > 2) {
            var flag = query[3] || false;
            var ref = query[1].charAt(0);
            if (ref == 't'){
                return db.table(query[2])
                .onSuccess(function(tbl) {
                    var state = tbl.result.drop(flag);
                    successCallback(state, "table");
                })
                .onError(handler.onError);
            } else if(ref == 'd') {
                return db.drop(flag, query[2], query[4])
                .onSuccess(function(state) {
                    successCallback(state, query[1]);
                })
                .onError(handler.onError);
            }
        }
        
        handler.onError({ state: "drop", message: query[1] + " command was not found, please type help for JDB command" })
    };
}