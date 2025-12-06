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
            //build table
            db.batchTransaction(transactions)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
        };
    }