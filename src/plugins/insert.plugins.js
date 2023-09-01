Database.plugins.jQl('insert', {
    help: ['insert -[data] -[tbl_name] (optional: [-replace -columnName] -hard  -skip)'],
    requiresParam: true,
    fn: insertPluginFn
});

//insert -table name -data
function insertPluginFn(query, handler) {
    var tblName = query[2],
        data = query[1] || [],
        options = query.slice(3),
        replaceCall = inarray('replace', options),
        skipProcessing = inarray('skip', options),
        hardInsert = inarray('hard', options);

    return function(db) {
        db
            .transaction(tblName, "writeonly")
            .onSuccess(function(tx) {
                var instance = tx.result.dataProcessing(!skipProcessing);
                /**
                 * check for insert or replace call
                 */
                if (replaceCall) {
                    instance = instance.insertReplace(data, options[1]);
                } else {
                    instance = instance.insert(data, hardInsert);
                }

                instance
                    .execute()
                    .then(handler.onSuccess, handler.onError)
                    .catch(handler.onError);
            })
            .onError(handler.onError)
    }
};