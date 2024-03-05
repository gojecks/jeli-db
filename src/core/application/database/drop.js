/**
 * 
 * @param {*} flag 
 * @param {*} db 
 * @param {*} localOnly 
 */
function DatabaseInstanceDrop(flag, db, localOnly) {
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        if (flag) {
            var dbResponse = privateApi.removeDB(db || dbName, localOnly);
            (isequal(dbResponse.code, 'error') ? reject : resolve)(dbResponse);
        } else {
            reject({ message: "Unable to drop DB, either invalid flag or no priviledge granted!!", errorCode: 401 });
        }
    });
};