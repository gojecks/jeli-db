/**
 * 
 * @param {*} tbl 
 * @param {*} types 
 */
function OnupdateEventHandler(tbl, types) {
    var _promiseData = {};
    this.eventName = "db.update";
    this.time = +new Date;
    this.table = tbl;
    this.types = types;
    Object.defineProperty(this, '_data', {
        get: function() {
            return _promiseData;
        }
    })
}

OnupdateEventHandler.prototype.getData = function(key, tblName) {
    if (!key) {
        return null;
    }

    tblName = tblName || this.table;
    if (key && this._data.hasOwnProperty(tblName)) {
        return this._data[tblName][key] ? this._data[tblName][key] : [];
    }

    return [];
};

OnupdateEventHandler.prototype.setData = function(tblName, data) {
    this._data[tblName] = data;
};

OnupdateEventHandler.prototype.getCheckSum = function(tblName) {
    return this._data[tblName || this.table].checksum;
};

OnupdateEventHandler.prototype.getAllUpdates = function() {
    return this._data;
};

OnupdateEventHandler.prototype.getTable = function(tblName) {
    return this._data[tblName || this.table];
};

OnupdateEventHandler.prototype.count = function(tblName, type) {
    var self = this;
    if (type) {
        return _count(type);
    }


    return this.types.reduce(function(accum, type) {
        accum += _count(type);
        return accum;
    }, 0);

    function _count(_type) {
        if (self._data.hasOwnProperty(tblName) && self._data[tblName][_type]) {
            return self._data[tblName][_type].length;
        }

        return 0;
    }
};