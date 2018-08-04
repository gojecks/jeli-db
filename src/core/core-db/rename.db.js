/**
 * 
 * @param {*} newName 
 */
DBEvent.prototype.rename = function(newName) {
    var defer = new $p();
    if ($isEqual(this.name, newName)) {
        defer.reject(dbErrorPromiseObject('new name cannot be same as old'));
    } else {
        var dbName = this.name;
        $queryDB.renameDataBase(this.name, newName, function() {
            var newResource = $queryDB.$getActiveDB(dbName).$get('resourceManager').getResource();
            if (newResource && newResource.lastSyncedDate) {
                this.api('POST', '/rename/database', { name: newName })
                    .then(defer.resolve, defer.reject);
            } else {
                defer.resolve(dbSuccessPromiseObject('rename', "Database renamed successfully"));
            }
        });
    }

    return new DBPromise(defer);
};