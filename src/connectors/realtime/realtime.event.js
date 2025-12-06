/**
 * 
 * @param {*} dbName
 * @param {*} types 
 */
class RealTimeEvent {
    constructor(dbName, types, data) {
        this.eventName = "db.update";
        this.time = +new Date;
        this.dbName = dbName;
        this.types = types || ['insert', 'update', 'delete'];
        Object.defineProperty(this, 'data', {
            get: () => data
        });
    }

    getRecord(type, tblName){
        var record = {};
        if (type && this.data.hasOwnProperty(tblName)) {
            record = this.data[tblName][type] || {};
        }

        return record;
    }
    
    isTableUpdated(tableName) {
        return this.data.hasOwnProperty(tableName);
    }

    getData(type, tblName) {
        var record = this.getRecord(type, tblName);
        return record.data || [];
    }

    getRefs(type, tblName) {
        var record = this.getRecord(type, tblName);
        return record.refs || [];
    }

    getCheckSum(tblName) {
        return this.data[tblName].checksum;
    }

    getAllUpdates() {
        return this.data;
    }

    getTable(tblName) {
        return this.data[tblName];
    }

    count(tblName, type) {
        var count = type => this.getData(type, tblName).length;
        if (type) return count(type);

        return this.types.reduce((accum, type) => (accum += count(type), accum), 0);
    }
}