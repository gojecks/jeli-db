//Cutom Plugins
//Environment Plugin 
Database.plugins.jQl('env', {
    help: 'env -[usage]',
    requiresParam: true,
    fn: envPluginFn
});


function envPluginFn(query, handler) {
    var ret = { state: query[0], result: {} };
    return function(db) {
        var task = db.env[query[1]];
        if (task) {
            var _task = task(query[2]);
            if (isobject(_task)) {
                ret.state = query[1];
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