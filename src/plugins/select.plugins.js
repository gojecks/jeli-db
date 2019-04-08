    //juser
    jplugins.jQl('select', {
        help: ['select -[fields] -[table] -Clause[ -[on] -[join] -[where] -[like] ] -limit -[orderBy] -[groupBy]'],
        requiresParam: true,
        fn: selectPluginFn
    });

    //select -columns -tableName
    //-join -CLAUSE -on -EXPRESSION
    //-Where -column -like -expression 
    function selectPluginFn(query, handler) {
        var table = query[2].split(',');
        return function(db) {
            if (query.length > 1) {
                //build table
                db
                    .transaction(table.length > 1 ? table : table[0])
                    .onSuccess(function(e) {
                        e.result
                            .select(query[1], buildSelectQuery(query, 3))
                            .execute()
                            .onSuccess(handler.onSuccess)
                            .onError(handler.onError);
                    })
                    .onError(handler.onError);
            }

        };
    }