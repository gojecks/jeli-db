//Import Plugin
//Called in env
//-env -import -tableName

jplugins.jQl('import', {
    help: ['import -[table name] -[fileType]'],
    requiresParam: true,
    fn: jImportPluginFn
});

function jImportPluginFn(query, handler) {
    var result = { state: query[0], result: { message: null } };
    return function(db) {
        var logService = privateApi.getNetworkResolver('logService', db.name);
        db.import(query[1], extend({
            logService: logService,
            onselect: function(fileName, file) {
                logService("Processing selected file :" + fileName);
            }
        }, handler));

    };
}