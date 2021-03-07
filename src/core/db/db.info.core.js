/**
 * get the DATABASE info
 * loop through the tables 
 * generate a new table Object containing the information of each tables
 */

function ApplicationInstanceInfo() {
    var tableSet = [],
        tables = privateApi.get(this.name, 'tables');
    if (tables) {
        findInList.call(tables, function(tblName, tbl) {
            tableSet.push(copy({
                name: tblName,
                records: (tbl.data || []).length || tbl._records,
                columns: tbl.columns,
                primaryKey: tbl.primaryKey,
                foreignKey: tbl.foreignKey,
                allowedMode: 'readwrite',
                lastModified: tbl.lastModified
            }, true));
        });
    }

    return tableSet;
};