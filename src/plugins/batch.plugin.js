    //juser
    Database.plugins.jQl('batch', {
        help: ['batch -[queries]'],
        requiresParam: true,
        fn: batchPluginFn
    });

    /**
     * 
     * @param {*} query 
     * @param {*} handler 
     */
    function batchPluginFn(query, handler) {
        var transactions = query[1];
        return function(db) {
            if (query.length > 1) {
                //build table
                db.batchTransaction(transactions)
                    .onSuccess(handler.onSuccess)
                    .onError(handler.onError);
            }

        };
    }