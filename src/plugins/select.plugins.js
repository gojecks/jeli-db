//juser
Database.plugins.jQl('select', {
    help: ['select -[fields] -[table] -Clause[ -join()  -where(CLAUSE[Like|IN|NOTIN]]) -limit() -orderBy() -groupBy()]'],
    requiresParam: true,
    fn: selectPluginFn
});

//select -columns -tableName
//-join -CLAUSE -on -EXPRESSION
//-Where -column -like -expression 
function selectPluginFn(query, handler) {
    var table = (query[2] || '').split(',');
    return function (db) {
        db.transaction(table)
            .select(query[1], QueryBuilder.buildSelectQuery(query, 3))
            .execute()
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
    };
}