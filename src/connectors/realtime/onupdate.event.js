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
        this.types = types;
        Object.defineProperty(this, '_data', {
            get: function () {
                return _promiseData;
            }
        });
    }
    
    isTableUpdated(tableName) {
        return this._data.hasOwnProperty(tableName);
    }
    getData(key, tblName) {
        if (!key || !tblName) {
            return null;
        }

        if (key && this._data.hasOwnProperty(tblName)) {
            return this._data[tblName][key] ? this._data[tblName][key] : [];
        }

        return [];
    }
    setData(records) {
        var handleDbUpdateData = ctbl => {
            var data = records[ctbl];
            RealtimeConnector.$privateApi
                .resolveUpdate(this.dbName, ctbl, data, false)
                .then(cdata => {
                    RealtimeConnector.$privateApi
                        .updateDB(this.dbName, ctbl, table => {
                            if (data.checksum) {
                                table._previousHash = data.previousHash;
                                table._hash = data.checksum;
                            }
                        });

                    // set the record 
                    this._data[ctbl] = cdata;
                });
        };

        // get response keys and evaluate the response
        Object.keys(records).forEach(handleDbUpdateData);
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
        var count = type => {
            if (this._data.hasOwnProperty(tblName) && this._data[tblName][type])
                return this._data[tblName][type].length;
            return 0;
        };

        if (type)
            return count(type);

        return this.types.reduce((accum, type) => (accum += count(type), accum), 0);
    }
}







