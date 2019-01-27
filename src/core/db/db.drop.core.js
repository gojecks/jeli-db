/**
 * Drop Database
 * @param {*} flag 
 */
DBEvent.prototype.drop = function(flag) {
    var defer = new _Promise();
    if (flag) {
        var dbResponse = $queryDB.removeDB(this.name);
        defer[$isEqual(dbResponse.code, 'error') ? 'reject' : 'resolve'](dbResponse);
    } else {
        defer.reject({ message: "Unable to drop DB, either invalid flag or no priviledge granted!!", errorCode: 401 });
    }

    return new DBPromise(defer);
};