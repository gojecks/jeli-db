/**
 * perform many transaction in one command
 * @param {*} transactions 
 * @returns 
 */
function ApplicationInstanceBatchTransaction(transactions) {
    var defer = new _Promise(),
        promise = new DBPromise(defer);
    if (!transactions || !$isArray(transactions)) {
        throw new Error('BatchTransaction: nothing to commit or invalid transaction format');
    }

    var tables = transactions.map(function(tx) {
        return tx.table;
    });

    this.transaction(tables, "write")
        .onSuccess(startBatchTransaction);

    function startBatchTransaction(tx) {
        transactions.forEach(performTransaction);

        function performTransaction(transaction) {
            if ($isEqual(transaction.type, "insert")) {
                tx.result.insert(transaction.data, false, transaction.table);
            } else if ($isEqual(transaction.type, "update")) {
                tx.result.update(transaction.data, transaction.query, transaction.table);
            } else if ($isEqual(transaction.type, "delete")) {
                tx.result.delete(transaction.query, transaction.table);
            }
        }

        var error = tx.result.getError(),
            time = performance.now(),
            ret = {
                state: "batch",
                result: {
                    message: "Batch transaction complete"
                }
            };
        /**
         * check if queries contains error
         */
        if (error.length) {
            ret.result.message = error.join('\n');
            defer.reject(ret);
            tx.result.cleanup();
        } else {
            tx.result.execute()
                .onSuccess(function(res) {
                    ret.result.transactions = res;
                    ret.timing = performance.now() - time;
                    defer.resolve(ret);
                });
        }
    }

    return promise;
}