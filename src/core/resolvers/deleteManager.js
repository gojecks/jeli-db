/**
 * 
 * @param {*} appName 
 * @param {*} context 
 */
function deleteManager(appName, context) {
    this.init = function() {
        var $delRecords = getStorageItem(privateApi.storeMapping.delRecordName);
        if ($delRecords && $delRecords.hasOwnProperty(appName)) {
            //update deleted records
            context.register('deletedRecords', $delRecords[appName]);
        }

        return this;
    };

    this.isDeletedDataBase = function() {
        return context.getResolvers('deletedRecords').database.hasOwnProperty(appName);
    };

    this.isDeletedTable = function(name) {
        return context.getResolvers('deletedRecords').table.hasOwnProperty(name);
    };

    this.reset = function() {
        context.register('deletedRecords', {
            table: {},
            database: {},
            rename: {}
        });

        return this;
    };

    this.isExists = function() {
        var $delRecords = getStorageItem(privateApi.storeMapping.delRecordName);
        return $delRecords && $delRecords.hasOwnProperty(appName);
    };

    this.getRecords = function() {
        return context.getResolvers('deletedRecords');
    };
}