/**
 * 
 * @param {*} table 
 * @param {*} response 
 * @param {*} lastInsertId 
 */
class InsertQueryEvent{
    constructor(table, lastInsertId, response) {
        this.state = "insert";
        this.table = table;
        this.lastInsertId = function() {
            return lastInsertId;
        };

        this.result = response;
    }
}