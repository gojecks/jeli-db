//Help Plugin
//Initialized in Env	

Database.plugins.jQl('help', {
    help: '-help',
    requiresParam: false,
    schema: {
        target: { position: 1, type: 'string' }
    },
    fn: helperPluginFn
});

//@Function generates help list
function helperPluginFn(query, handler) {
    const result = { state: query.command, result: { message: null } };
    return function(db) {
        let helpers;
        const plugin = Database.plugins.get(query.target)
        if (query.target && plugin) {
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