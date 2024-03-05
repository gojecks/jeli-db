/**
 * get the DATABASE info
 * loop through the tables 
 * generate a new table Object containing the information of each tables
 */

function DatabaseInstanceInfo() {
    var tableSet = [],
        tables = privateApi.get(this.name, 'tables');
    if (tables) {
        for(var tblName in tables){
            tableSet.push(copy({
                name: tblName,
                records: tables[tblName]._records,
                columns: tables[tblName].columns,
                primaryKey: tables[tblName].primaryKey,
                foreignKey: tables[tblName].foreignKey,
                allowedMode: 'readwrite',
                lastModified: tables[tblName].lastModified,
                index: tables[tblName].index
            }, true));
        }
    }

    return tableSet;
};