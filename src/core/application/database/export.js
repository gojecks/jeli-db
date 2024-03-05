/**
 * 
 * @param {*} table 
 * @param {*} type 
 * @param {*} title 
 * @returns 
 */
function DatabaseInstanceExport(table, type, title) {
    var type = type || 'csv';
    var exp = new jExport(type, title, table == 'all');
    var name = this.name;

    function extractTableSchema(tableName){
        var tableSchema = privateApi.getTable(name, tableName);
        if (!tableSchema) return false;
        var tableData = privateApi.getTableData(name, tableName);
        //if export type was a JSON format
        if (['json', 'jql'].includes(type)) {
            //put the json data
            exp.put(tableSchema, tableData);
        } else {
            //set label
            exp.put(tableName, Object.keys((tableSchema.columns[0] || {})), tableData);
        }

        return true;
    }

    return ({
        initialize: () => {
           var notFound = false;
            // export all table schematics and data
            if (table =='all') {
                var tableNames = privateApi.getDbTablesNames(name);
                for(var tableName of tableNames) {
                    if(!extractTableSchema(tableName)){
                        notFound = true;
                        console.log('Failed to extract '+ tableName + ', schema configuration not found');
                        break;
                    }
                }
            } else {
                notFound = !extractTableSchema(table);
            }

            //Parse the data of its not an OBJECT
            if (notFound) {
                return dbErrorPromiseObject("unable to generate export, empty or invalid table provided");
            }

            //close the exporter
            return exp.close();
        }
    });
};