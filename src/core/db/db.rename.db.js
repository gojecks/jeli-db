/**
 * 
 * @param {*} newName 
 */
function ApplicationInstanceRename(newName) {
    var defer = new _Promise();
    if ($isEqual(this.name, newName)) {
        defer.reject(dbErrorPromiseObject('new name cannot be same as old'));
    } else {
        var dbName = this.name,
            _self = this;
        privateApi.renameDataBase(this.name, newName, function() {
            var newResource = privateApi.getActiveDB(dbName).get('resourceManager').getResource();
            if (newResource && newResource.lastSyncedDate) {
                _self.api('/database/rename', { name: newName })
                    .then(function(result) {
                        defer.resolve(result);
                    }, function(err) {
                        defer.reject(err);
                    });
            } else {
                defer.resolve(dbSuccessPromiseObject('rename', "Database renamed successfully"));
            }
        });
    }

    return defer;
};