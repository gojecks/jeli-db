/**
 * 
 * @param {*} newName 
 */
function ApplicationInstanceRename(newName) {
    var dbName = this.name;
    var _this = this;
    return new DBPromise(function(resolve, reject) {
        var resourceInstance = privateApi.getActiveDB(dbName).get(constants.RESOURCEMANAGER);
        if (isequal(dbName, newName)) {
            failed({ message: newName + ' cannot be same as ' + dbName });
        } else {
            var resource = resourceInstance.getResource();
            if (resource && resource.lastSyncedDate) {
                // rename from BE before  updating client 
                _this.api({ path: '/application/rename', data: { name: newName } })
                    .then(renameClient, reject);
            } else {
                renameClient(dbSuccessPromiseObject('rename', "application renamed successfully"));
            }
        }

        /**
         * 
         * @param {*} res 
         */
        function renameClient(res) {
            privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.RENAME_DATABASE, [dbName, newName, function() {
                // set the new name 
                _this.name = newName;
                privateApi.databaseContainer.rename(dbName, newName);
                resourceInstance.renameResource(newName);
                resolve(res);
            }]);
        }

        function failed(err) {
            reject(dbErrorPromiseObject(err.message || 'Unabled to rename application, please try again'));
        }
    });
};