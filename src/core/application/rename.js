/**
 * 
 * @param {*} newName 
 */
function ApplicationInstanceRename(newName) {
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        if ($isEqual(dbName, newName)) {
            reject(dbErrorPromiseObject(newName + ' cannot be same as ' + dbName));
        } else {
            privateApi.renameDataBase(dbName, newName, function() {
                var newResource = privateApi.getActiveDB(dbName).get(constants.RESOURCEMANAGER).getResource();
                if (newResource && newResource.lastSyncedDate) {
                    _self.api('/database/rename', { name: newName })
                        .then(resolve, reject);
                } else {
                    resolve(dbSuccessPromiseObject('rename', "Database renamed successfully"));
                }
            });
        }
    });
};