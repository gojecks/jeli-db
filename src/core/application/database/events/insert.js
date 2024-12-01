class InsertQueryEvent{
    /**
     * 
     * @param {*} table 
     * @param {*} lastInsertId 
     * @param {*} refs 
     * @param {*} response 
     */
    constructor(table, lastInsertId, refs, response) {
        this.state = "insert";
        this.table = table;
        this.refs = refs;
        this.lastInsertId = function() {
            return lastInsertId;
        };

        this.result = response;
    }

    rollBack(){
        
    }
}