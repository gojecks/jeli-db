//@Function clearScreen
//Clear Screen Plugin
Database.plugins.jQl('cls', {
    help: ['-cls (clearScreen)'],
    requiresParam: false,
    schema: {},
    fn: clearScreenPluginFn
});

function clearScreenPluginFn(query, handler) {
    const result = { state: query.command, result: { message: null } };
    return function(db) {
        result.result.message = true;
        return handler.onSuccess.apply(handler.onSuccess, [result]);
    };
}