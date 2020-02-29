/**
 * 
 * @param {*} tbl 
 */
function OnupdateEventHandler(tbl, types) {
    var promiseData = {};
    this.eventName = "db.update";
    this.time = +new Date;
    this.getData = function(key, tblName) {
        if (!key) {
            return null;
        }

        tblName = tblName || tbl;

        if (key && promiseData.hasOwnProperty(tblName)) {
            return promiseData[tblName][key] ? promiseData[tblName][key] : [];
        }

        return [];
    };

    this.setData = function(tblName, data) {
        promiseData[tblName] = data;
    };

    this.getCheckSum = function(tblName) {
        return promiseData[tblName || tbl].checksum;
    };

    this.getAllUpdates = function() {
        return promiseData;
    };

    this.getTable = function(tblName) {
        return promiseData[tblName || tbl];
    };

    this.count = function(tblName, type) {
        if (type) {
            return _count(type);
        }


        return types.reduce(function(accum, type) {
            accum += _count(type);
            return accum;
        }, 0);

        function _count(_type) {
            if (promiseData.hasOwnProperty(tblName) && promiseData[tblName][_type]) {
                return promiseData[tblName][_type].length;
            }

            return 0;
        }
    };
}