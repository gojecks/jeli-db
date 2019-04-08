//Help Plugin
//Initialized in Env	

jplugins.jQl('help', {
    help: '-help',
    requiresParam: false,
    fn: helperPluginFn
});

//@Function generates help list
function helperPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        var helpers;
        if (query[1] && customPlugins._content[query[1]]) {
            helpers = [].concat(customPlugins._content[query[1]].help);
        } else {
            helpers = db.jDBHelpers.get().concat();
            for (var plugin in customPlugins._content) {
                helpers = helpers.concat(customPlugins._content[plugin].help);
            }
        }

        result.result.message = helpers;
        return handler.onSuccess.apply(handler.onSuccess, [result]);
    };
}