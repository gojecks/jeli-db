//Import Plugin
//Called in env
//-env -import -tableName

Database.plugins.jQl('import', {
    help: ['import -[table name] -[fileType] -isSchema[true|false]'],
    schema: {
        table: { position: 1, type: 'string' },
        fileType: { position: 2, type: 'string' },
        isSchema: { position: 3, type: 'boolean' }
    },
    requiresParam: true,
    fn: jImportPluginFn
});

function jImportPluginFn(query, handler) {
    return db => {
        const logService = privateApi.getConfigData('logService', db.name);
        db.import(query.table, query.isSchema, Object.assign({
            logService: logService,
            onselect: function(file) {
                logService("Processing selected file :" + file.name);
            }
        })).selectFile().then(res => handler.onSuccess(res), err => handler.onError(err));
    };
}