/**
 * get the DATABASE info
 * loop through the tables 
 * generate a new table Object containing the information of each tables
 */

DBEvent.prototype.info = function() {
    var tableSet = {},
        tables = $queryDB.$get(this.name, 'tables');
    if (tables) {
        findInList.call(tables, function(tblName, tbl) {
            tableSet[tblName] = {
                records: (tbl.data || []).length,
                columns: tbl.columns,
                primaryKey: tbl.primaryKey,
                foreignKey: tbl.foreignKey,
                allowedMode: 'readwrite'
            };
        });
    }

    return tableSet;
};