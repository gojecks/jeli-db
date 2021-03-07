/**
 * 
 * @param {*} flag 
 * @param {*} db 
 * @param {*} localOnly 
 */
function ApplicationInstanceDrop(flag, db, localOnly) {
    var defer = new _Promise();
    if (flag) {
        var dbResponse = privateApi.removeDB(db || this.name, localOnly);
        defer[$isEqual(dbResponse.code, 'error') ? 'reject' : 'resolve'](dbResponse);
    } else {
        defer.reject({ message: "Unable to drop DB, either invalid flag or no priviledge granted!!", errorCode: 401 });
    }

    return new DBPromise(defer);
};