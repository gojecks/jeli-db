/**
 * 
 * @param {*} core 
 */
class StoreProcedure{
    constructor(core) {
        this.databaseContext = core;
        this._procedures = new Map();
    }
  
    /**
     * set a storeProcedure
     * @param name
     * @param definition
     * 
     */
    create(procName, query) {
        this._procedures.set(procName, query);
        return this;
    }

    /**
     * remove a storeProcedure
     */
    remove(name){
        this._procedures.delete(name);
    }

    execute(name, params) {
        return new DBPromise((resolve, reject) => {
            var query = this._procedures.get(name);
            if (query) {
                this.databaseContext.jQl(query, null, params).then(resolve, reject);
            } else {
                reject("No store proc found for " + name);
            }
        });
    }
}