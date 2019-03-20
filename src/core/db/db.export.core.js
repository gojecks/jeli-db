/**
 * @param {*} table
 * @param {*} type
 */
ApplicationInstance.prototype['export'] = function(type, table) {
    var type = type || 'csv',
        exp = new jExport(type),
        _table = privateApi.$getTable(this.name, table);

    //getValue
    function getValueInArray(cdata) {
        var ret = []
        expect(cdata).each(function(item) {
            ret.push($isObject(item) ? JSON.stringify(item) : item);
        });

        return ret;
    }

    return ({
        initialize: function(title) {
            //Parse the data of its not an OBJECT
            if (!_table) {
                return dbErrorPromiseObject("unable to export table, empty or invalid table data");
            }

            //if export type was a JSON format
            if ($inArray(type, ['json', 'jql'])) {
                //put the json data
                exp.put(_table);
            } else {
                //Open the exporter
                exp.open(title);
                //set label
                exp.row(Object.keys(_table.columns[0]));
                //set the data
                expect((_table.data || []).slice()).each(function(item) {
                    exp.row(getValueInArray(item._data));
                });
            }

            //close the exporter
            return exp.close();
        }
    });
};