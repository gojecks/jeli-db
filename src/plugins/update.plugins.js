//update -table -records
//Clause -where -columns -like:expression

Database.plugins.jQl('update', {
    help: ['-update -[tbl_name] -[data] -condition[[where] [like]] -ignoreSync -rollbackOnError'],
    schema: {
        table: { position: 1, type: 'string' },
        data: { position: 2, type: 'object' },
        cond: { position: 3 },
        ignoreSync: { flag: true },
        rollbackOnError: { flag: true }
    },
    requiresParam: true,
    fn: updatePluginFn
});

Database.plugins.jQl('updatemany', {
    help: ['-updateMany -[tbl_name] -[data] -ignoreSync -rollbackOnError'],
    schema: {
        table: { position: 1, type: 'string' },
        // unlike 'update', this is used directly as the update-records array
        // (see updatePluginFn: `!query.isMany ? [[cond,data]] : query.data`)
        data: { position: 2, type: 'array' },
        isMany: { const: true },
        ignoreSync: { flag: true },
        rollbackOnError: { flag: true }
    },
    requiresParam: true,
    fn: updatePluginFn
})

//create -tablename -columns
function updatePluginFn(query, handler) {
    if (isstring(query.data)){
        query.data = stringEqualToObject(query.data);
    }
        
    const updateRecords = (!query.isMany ? [[query.cond, query.data]] : query.data);
    return function (db) {
        db
            .transaction(query.table, 'writeonly')
            .update(updateRecords, query.isMany)
            .execute(query.ignoreSync, false, query.rollbackOnError)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
    }
}