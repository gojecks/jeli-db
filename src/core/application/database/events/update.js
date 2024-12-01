class UpdateQueryEvent{
    constructor(tableName, updated, time, refs){
        this.state = "update";
        this.table = tableName;
        this.totalUpdated = updated;
        this.timing = performance.now() - time;
        this.message = updated + " row(s) updated.";
        this.refs = refs;
    }

    rollBack(){

    }
}