/**
 * 
 * @param {*} dbName
 * @param {*} types 
 */
function OnupdateEventHandler(dbName, types) {
    var _promiseData = {};
    this.eventName = "db.update";
    this.time = +new Date;
    this.dbName = dbName;
    this.types = types;
    Object.defineProperty(this, '_data', {
        get: function() {
            return _promiseData;
        }
    });
}

OnupdateEventHandler.prototype.isTableUpdated = function(tableName) {
    return this._data.hasOwnProperty(tableName);
}

OnupdateEventHandler.prototype.getData = function(key, tblName) {
    if (!key || !tblName) {
        return null;
    }

    if (key && this._data.hasOwnProperty(tblName)) {
        return this._data[tblName][key] ? this._data[tblName][key] : [];
    }

    return [];
};

OnupdateEventHandler.prototype.setData = function(records) {
    var _this = this;

    function handleDbUpdateData(ctbl) {
        var _data = records[ctbl];
        privateApi
            .resolveUpdate(_this.dbName, ctbl, _data, false)
            .then(function(cdata) {
                privateApi
                    .updateDB(_this.dbName, ctbl, function(table) {
                        if (_data.checksum) {
                            table._previousHash = _data.previousHash;
                            table._hash = _data.checksum;
                        }
                    });

                // set the record 
                _this._data[ctbl] = cdata;
            });
    }

    // get response keys and evaluate the response
    Object.keys(records).forEach(handleDbUpdateData);
};

OnupdateEventHandler.prototype.getCheckSum = function(tblName) {
    return this._data[tblName].checksum;
};

OnupdateEventHandler.prototype.getAllUpdates = function() {
    return this._data;
};

OnupdateEventHandler.prototype.getTable = function(tblName) {
    return this._data[tblName];
};

OnupdateEventHandler.prototype.count = function(tblName, type) {
    var _this = this;
    if (type) {
        return _count(type);
    }


    return this.types.reduce(function(accum, type) {
        accum += _count(type);
        return accum;
    }, 0);

    function _count(_type) {
        if (_this._data.hasOwnProperty(tblName) && _this._data[tblName][_type]) {
            return _this._data[tblName][_type].length;
        }

        return 0;
    }
};