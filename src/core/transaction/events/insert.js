/**
 * 
 * @param {*} ret 
 * @param {*} objectStore 
 * @param {*} lastInsertId 
 */
function InsertQueryEvent(ret, objectStore, lastInsertId) {
    this.lastInsertId = function() {
        return lastInsertId;
    };

    this.result = objectStore;

    /**
     * add the ret object to the instance
     */
    var _this = this;
    Object.keys(ret).forEach(function(key) {
        _this[key] = ret[key];
    });
}