//Cutom Plugins
//Environment Plugin 
Database.plugins.jQl('api', {
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
        db.api(query[1], query[2], query[3] || '')
            .then(function(res) {
                handler.onSuccess.apply(handler.onSuccess, [res]);
            }, function(err) {
                handler.onError.apply(handler.onError, [err]);
            });

    };
}