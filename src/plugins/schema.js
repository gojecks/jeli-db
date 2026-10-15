Database.plugins.jQl('schema', {
    help: ['schema -export -loadfromserver[true|false]', 'schema -add -data'],
    requiresParam: true,
    schema: {
        action: { position: 1, type: 'string' },
        // not typed: 'arg' is a server URL string for one action and
        // arbitrary schemaData for another (see SchemaPluginFn below)
        arg: { position: 2 }
    },
    fn: SchemaPluginFn
});

function SchemaPluginFn(query, handler) {
    return function(db) {
        try {
            var options = {
                version: db.version,
                server: query.arg
            };

            if (isequal(query.action, 'add')) {
                options.schemaData = query.arg;
            }

            db.schema[query.action](options).then(function(message) {
                handler.onSuccess({ state: query.command, result: { message: message } });
            }, function(message) {
                handler.onError({
                    message: message
                });
            });
        } catch (e) {
            handler.onError({
                message: "Unable to perform action"
            });
        }
    };
}