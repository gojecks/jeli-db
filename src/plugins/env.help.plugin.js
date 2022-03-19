//Help Plugin
//Initialized in Env	

Database.plugins.jQl('help', {
    help: '-help',
    requiresParam: false,
    fn: helperPluginFn
});

//@Function generates help list
function helperPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        var helpers;
        var plugin = Database.plugins.get(query[1])
        if (query[1] && plugin) {
            helpers = [].concat(plugin.help);
        } else {
            helpers = db.helpers.get().concat();
            Database.plugins._pluginsContainer.forEach(function(item) {
                helpers = helpers.concat(item.help);
            });
        }

        result.result.message = helpers;
        return handler.onSuccess.apply(handler.onSuccess, [result]);
    };
}