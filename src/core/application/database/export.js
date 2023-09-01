/**
 * @param {*} table
 * @param {*} type
 */
function DatabaseInstanceExport(type, table) {
    var type = type || 'csv';
    var exp = new jExport(type);
    var tableSchema = privateApi.getTable(this.name, table);
    var tableData = privateApi.getTableData(this.name, table);

    //getValue
    function getValueInArray(cdata) {
        return Object.values(cdata).map(item => (isobject(item) ? JSON.stringify(item) : item));
    }

    return ({
        initialize: function(title) {
            //Parse the data of its not an OBJECT
            if (!tableSchema) {
                return dbErrorPromiseObject("unable to generate export, empty or invalid table provided");
            }

            //if export type was a JSON format
            if (inarray(type, ['json', 'jql'])) {
                //put the json data
                exp.put(tableSchema);
            } else {
                //Open the exporter
                exp.open(title);
                //set label
                exp.row(Object.keys(tableSchema.columns[0]));
                //set the data
                for (var i = 0; i < tableData.length; i++) {
                    exp.row(getValueInArray(tableData[i]._data));
                }
            }

            //close the exporter
            return exp.close();
        }
    });
};