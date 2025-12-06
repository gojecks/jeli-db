//Import Plugin
//Called in env
//-env -import -tableName

Database.plugins.jQl('import', {
    help: ['import -[table name] -[fileType] -isSchema[true|false]'],
    map: {
        table: 1,
        fileType: 2,
        isSchema: 3
    },
    requiresParam: true,
    fn: jImportPluginFn
});

function jImportPluginFn(query, handler) {
    return db => {
        var logService = privateApi.getConfigData('logService', db.name);
        db.import(query.table, query.isSchema, Object.assign({
            logService: logService,
            onselect: function(fileName, file) {
                logService("Processing selected file :" + fileName);
            }
        })).then(res => handler.onSuccess(res), err => handler.onError(err));
    };
}