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
        return new DBPromise(function(resolve, reject) {
            var query = _procedures.get(name);
            if (query) {
                core.jQl(query, null, params).then(resolve, reject);
            } else {
                reject("No store proc found for " + name);
            }
        });
    };
}