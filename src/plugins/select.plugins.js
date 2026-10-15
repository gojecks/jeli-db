//juser
Database.plugins.jQl('select', {
    help: ['select -[fields] -[table] -Clause[ -join()  -where(CLAUSE[Like|IN|NOTIN]]) -limit() -orderBy() -groupBy()]'],
    requiresParam: true,
    schema: {
        fields: { position: 1, type: 'string' },
        table: { position: 2, type: 'string' },
        // -join(...) -where(...) -limit(...) -orderBy(...) -groupBy(...), kept
        // raw (unparsed) since QueryBuilder.buildSelectQuery does its own
        // per-clause "name(args)" parsing on these tokens
        clauses: { position: 3, rest: true, raw: true }
    },
    fn: selectPluginFn
});

//select -columns -tableName
//-join -CLAUSE -on -EXPRESSION
//-Where -column -like -expression
function selectPluginFn(query, handler) {
    var table = (query.table || '').split(',');
    return function (db) {
        db.transaction(table)
            .select(query.fields, QueryBuilder.buildSelectQuery(query.clauses, 0))
            .execute()
            .then(handler.onSuccess, handler.onError)
            .catch(handler.onError)
    };
}