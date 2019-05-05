//Cutom Plugins
//Environment Plugin 
jEliDB.JDB_PLUGINS.jQl('api', {
    help: ['api -state[STRING || OBJECT] -[optional:data] -table',
        'state: OBJECT SCHEMA : {URL:STRING, METHOD:STRING, AUTH_TYPE:INT, body:ANY}',
        'state: STRING - /api/request/path '
    ],
    requiresParam: true,
    fn: apiPluginFn
});

/*
	@api : /set/access/token
	@api : /set/security/nonce
*/

function apiPluginFn(query, handler) {
    return function(db) {
        var postData = query[2],
            table = query[3] || '';


        db[query[0]](query[1], postData, table)
            .then(function(res) {
                handler.onSuccess.apply(handler.onSuccess, [res]);
            }, function(err) {
                handler.onError.apply(handler.onError, [err]);
            });

    };
}