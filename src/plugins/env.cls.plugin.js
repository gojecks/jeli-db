//@Function clearScreen
//Clear Screen Plugin
jEliDB.plugins.jQl('cls', {
    help: ['-cls (clearScreen)'],
    requiresParam: false,
    fn: clearScreenPluginFn
});

function clearScreenPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        result.result.message = true;
        return handler.onSuccess.apply(handler.onSuccess, [result]);
    };
}