/**
 * @param {*} name
 * @param {*} mode 
 */
function ApplicationInstanceTable(name, mode) {
    var defer = new _Promise();
    //get the requested table
    if (name && privateApi.getActiveDB(this.name).get('$tableExist')(name)) {
        defer.resolve({ result: new jEliDBTBL(privateApi.getTable(this.name, name), mode) });
    } else {
        defer.reject({ message: "There was an error, Table (" + name + ") was not found on this DB (" + this.name + ")", errorCode: 401 })
    }

    return new DBPromise(defer);
};