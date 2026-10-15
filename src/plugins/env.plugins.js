//Cutom Plugins
//Environment Plugin 
Database.plugins.jQl('env', {
    help: 'env -[usage]',
    requiresParam: true,
    schema: {
        method: { position: 1, type: 'string' },
        // not typed: passed straight through to whichever db.env[method] is
        // called, whose argument shape varies per method
        arg: { position: 2 }
    },
    fn: envPluginFn
});


function envPluginFn(query, handler) {
    var ret = { state: query.command, result: {} };
    return function(db) {
        var task = db.env[query.method];
        if (task) {
            var _task = task(query.arg);
            if (isobject(_task)) {
                ret.state = query.method;
                _task.then(function(res) {
                    //set the state
                    ret.result = res;
                    handler.onSuccess.apply(handler.onSuccess, [ret]);
                }, function(err) {
                    handler.onError.apply(handler.onError, [err.data || {
                        message: "There was a network error, please try again later"
                    }]);
                });
                return true;
            } else {
                ret.result.message = _task;
                return handler.onSuccess.apply(handler.onSuccess, [ret]);
            }

        }

        return handler.onError.apply(handler.onError, [dbErrorPromiseObject("Invalid command passed, use -help for help")]);
    };
}