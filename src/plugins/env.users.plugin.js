//juser environment Plugin
jEliDB.JDB_PLUGINS.jQl('_users', {
    help: '_users -[add|remove|authorize|update|isExists] -param {JSON_OBJECT}',
    requiresParam: true,
    fn: jUsersPluginFn
});

function jUsersPluginFn(query, handler) {
    return function(db) {
        var _dbUsers = db._users();

        if (_dbUsers && _dbUsers[query[1]] && query.length > 2) {
            _dbUsers[query[1]](jSonParser(query[2]))
                .then(handler.onSuccess, handler.onError);

        } else {
            return handler.onError.apply(handler.onError, [dbErrorPromiseObject("Invalid command passed, use -help for help")]);
        }
    };
}