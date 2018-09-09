//Cutom Plugins
//Environment Plugin 
jEliDB.plugins.jQl('api', {
    help: ['api -state -[optional:data] -table'],
    requiresParam: true,
    fn: apiPluginFn
});

/*
	@api : /set/access/token
	@api : /set/security/nonce
*/

function apiPluginFn(query, handler) {
    return function(db) {
        var postData = maskedEval(query[2]),
            table = query[3] || '';


        db[query[0]](query[1], postData, table)
            .then(function(res) {
                handler.onSuccess.apply(handler.onSuccess, [res]);
            }, function(err) {
                handler.onError.apply(handler.onError, [err]);
            });

    };
}