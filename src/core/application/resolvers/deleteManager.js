/**
 * 
 * @param {*} appName 
 * @param {*} context 
 */
class deleteManager {
    constructor(appName, context){
        this.appName = appName;
        this.context = context;
    }
    
    init() {
        var $delRecords = privateApi.storageFacade.get(privateApi.storeMapping.delRecordName);
        if ($delRecords && $delRecords.hasOwnProperty(this.appName)) {
            //update deleted records
            context.register('deletedRecords', $delRecords[this.appName]);
        }

        return this;
    }

    isDeletedDataBase() {
        return this.context.getResolvers('deletedRecords').database.hasOwnProperty(this.appName);
    }

    isDeletedTable(name) {
        return this.context.getResolvers('deletedRecords').table.hasOwnProperty(name);
    }

    reset() {
        this.context.register('deletedRecords', {
            table: {},
            database: {},
            rename: {}
        });

        return this;
    }

    isExists() {
        var delRecords = privateApi.storageFacade.get(privateApi.storeMapping.delRecordName);
        return delRecords && delRecords.hasOwnProperty(this.appName);
    }

    getRecords() {
        return this.context.getResolvers('deletedRecords');
    };
}