//Help Plugin
//Initialized in Env	

jEliDB.JDB_PLUGINS.jQl('help', {
    help: '-help',
    requiresParam: false,
    fn: helperPluginFn
});

//@Function generates help list
function helperPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        var helpers;
        if (query[1] && customPlugins.has(query[1])) {
            helpers = [].concat(customPlugins.get(query[1]).help);
        } else {
            helpers = db.helpers.get().concat();
            customPlugins.forEach(function(item) {
                helpers = helpers.concat(item.help);
            })
        }

        result.result.message = helpers;
        return handler.onSuccess.apply(handler.onSuccess, [result]);
    };
}