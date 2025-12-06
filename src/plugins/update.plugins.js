//update -table -records
//Clause -where -columns -like:expression

Database.plugins.jQl('update', {
    help: ['-update -[tbl_name] -[data] -condition[[where] [like]] -ignoreSync'],
    map: {
        table: 1,
        data: 2,
        cond: 3,
        ignoreSync: 4
    },
    requiresParam: true,
    fn: updatePluginFn
});

Database.plugins.jQl('updatemany', {
    help: ['-updateMany -[tbl_name] -[data] -ignoreSync'],
    map: {
        table: 1,
        data: 2,
        isMany: true,
        ignoreSync: 3
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
            .execute(query.ignoreSync)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
    }
}