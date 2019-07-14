/**
 * 
 * @param {*} core 
 */
function StoreProcedure(core) {
    var _procedures = new Map();
    /**
     * set a storeProcedure
     * @param name
     * @param definition
     * 
     */
    this.create = function(procName, query) {
        _procedures.set(procName, query);
        return this;
    };

    /**
     * remove a storeProcedure
     */
    this.remove = _procedures.delete;

    this.execute = function(name, params) {
        var query = _procedures.get(name),
            defer = new _Promise(),
            promise = new DBPromise(defer);
        if (query) {
            core.jQl(query, {
                onSuccess: function(res) {
                    defer.resolve(res);
                },
                onError: function(err) {
                    defer.reject(err);
                }
            }, params);
        } else {
            promise.reject("No store proc found for " + name);
        }

        return promise;
    };
}