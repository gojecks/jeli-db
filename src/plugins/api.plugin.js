//Cutom Plugins
//Environment Plugin 
Database.plugins.jQl('api', {
    help: ['api -state[STRING || OBJECT] -[optional:data] -table',
        'state: OBJECT SCHEMA : {URL:STRING, METHOD:STRING, AUTH_TYPE:INT, body:ANY}',
        'state: STRING - /api/request/path '
    ],
    requiresParam: true,
    schema: {
        // not typed: BaseInstance#api's own doc says path/state can be
        // either a STRING (a route) or an OBJECT (a full request descriptor)
        path: { position: 1 },
        // not typed: request body is arbitrary ("body:ANY" per the help text)
        data: { position: 2 }
    },
    fn: apiPluginFn
});

/*
	@api : /set/access/token
	@api : /set/security/nonce
*/

function apiPluginFn(query, handler) {
    return function(db) {
        db.api(query.path, query.data)
            .then(function(res) {
                handler.onSuccess.apply(handler.onSuccess, [res]);
            }, function(err) {
                handler.onError.apply(handler.onError, [err]);
            });

    };
}