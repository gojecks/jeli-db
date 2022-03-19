Database.plugins.jQl('schema', {
    help: ['schema -export -loadfromserver[true|false]', 'schema -add -data'],
    requiresParam: true,
    fn: SchemaPluginFn
});

function SchemaPluginFn(query, handler) {
    return function(db) {
        try {
            var options = {
                version: db.version,
                server: query[2]
            };

            if ($isEqual(query[1], 'add')) {
                options.schemaData = query[2];
            }

            db.schema[query[1]](options).then(function(message) {
                handler.onSuccess({ state: query[0], result: { message: message } });
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