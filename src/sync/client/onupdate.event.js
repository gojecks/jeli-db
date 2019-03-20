/**
 * 
 * @param {*} tbl 
 */
function OnupdateEventHandler(tbl) {
    var promiseData = {};
    this.eventName = "db.update";
    this.time = +new Date;
    this.getData = function(key, tblName) {
        if (!key || !tblName) {
            return null;
        }

        tblName = tblName || tbl;

        return (key && promiseData[tblName][key]) ? promiseData[tblName][key] : [];
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

    this.count = function(tblName) {
        var total = 0;
        this.types.forEach(function(type) {
            total += promiseData[tblName || tbl][type].length;
        });

        return total;
    }
}