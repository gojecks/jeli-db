/**
 * 
 * @param {*} dbName
 * @param {*} types 
 */
class OnupdateEventHandler {
    constructor(dbName, types) {
        var _promiseData = {};
        this.eventName = "db.update";
        this.time = +new Date;
        this.dbName = dbName;
        this.types = types || ['insert', 'update', 'delete'];
        Object.defineProperty(this, '_data', {
            get: function () {
                return _promiseData;
            }
        });

        this.setData = function(tbl, record) {
            // get response keys and evaluate the response
            _promiseData[tbl] = record;
        };
    }

    getRecord(type, tblName){
        var record = {};
        if (type && this._data.hasOwnProperty(tblName)) {
            record = this._data[tblName][type] || {};
        }

        return record;
    }
    
    isTableUpdated(tableName) {
        return this._data.hasOwnProperty(tableName);
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
        return this._data[tblName].checksum;
    }

    getAllUpdates() {
        return this._data;
    }

    getTable(tblName) {
        return this._data[tblName];
    }

    count(tblName, type) {
        var count = type => this.getData(type, tblName).length;
        if (type) return count(type);

        return this.types.reduce((accum, type) => (accum += count(type), accum), 0);
    }
}