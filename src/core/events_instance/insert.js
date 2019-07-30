/**
 * 
 * @param {*} table 
 * @param {*} response 
 * @param {*} lastInsertId 
 */
function InsertQueryEvent(table, lastInsertId, response) {
    this.state = "insert";
    this.table = table;
    this.lastInsertId = function() {
        return lastInsertId;
    };

    this.result = response;
}