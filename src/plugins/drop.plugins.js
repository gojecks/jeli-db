Database.plugins.jQl('drop', {
    help: ['-drop [-t or -d] -[tbl_name] -flag[ [yes] or [no] ] -localOnly'],
    map: {
        type: 1,
        name: 2,
        flag: 3,
        localOnly: 4
    },
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

        if (query.type) {
            var ref = query.type.charAt(0);
            if (ref == 't'){
                var response = db.table(query.name).drop(query.flag);
                return successCallback(response, "table");
            } else if(ref == 'd') {
                var response = db.drop(query.flag, query.name, query.localOnly);
                return successCallback(response, query.type);
            }
        }
        
        handler.onError({ state: "drop", message: query[1] + " command was not found, please type help for JDB command" })
    };
}