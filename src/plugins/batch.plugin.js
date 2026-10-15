    //juser
    Database.plugins.jQl('batch', {
        help: ['batch -[queries]'],
        requiresParam: true,
        schema: {
            transactions: { position: 1, type: 'array' },
            rollbackOnError: { flag: true }
        },
        fn: batchPluginFn
    });

    /**
     * 
     * @param {*} query 
     * @param {*} handler 
     */
    function batchPluginFn(query, handler) {
        return function(db) {
            //build table
            db.batchTransaction(query.transactions, query.rollbackOnError)
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
        };
    }