Database.plugins.jQl('insert', {
    help: ['insert -[data] -[tbl_name] (optional: [-replace -columnName] -hard -skip -ignoreSync -rollbackOnError)'],
    requiresParam: true,
    schema: {
        // data isn't typed: it's an object for a single record, or an array
        // of objects for a bulk insert (see test/createDB.test.js), so no
        // single type is correct here
        data: { position: 1 },
        table: { position: 2, type: 'string' },
        ignoreSync: { flag: true },
        rollbackOnError: { flag: true },
        replace: { flag: true },
        skip: { flag: true },
        hard: { flag: true }
    },
    fn: insertPluginFn
});

//insert -table name -data
function insertPluginFn(query, handler) {
    return function (db) {
        let instance = db.transaction(query.table, "writeonly");
        instance.dataProcessing(!query.skip);
        /**
         * check for insert or replace call
         */
        if (query.replace) {
            instance = instance.insertReplace(query.data, query.skip);
        } else {
            instance = instance.insert(query.data, query.hard, query.table);
        }

        instance
            .execute(query.ignoreSync, false, query.rollbackOnError)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError);
    }
};