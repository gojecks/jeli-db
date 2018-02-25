DBEvent.prototype['export'] = function(table, type) {
    var type = type || 'csv',
        exp = new jExport(type),
        data = $queryDB.$getTable(this.name, table).data.slice();

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
            if (!data) {
                return dbSuccessPromiseObject("export", "unable to export data, invalid table data")
            }

            //if export type was a JSON format
            if ($isEqual(type, 'json')) {
                //put the json data
                exp.put(data);
            } else {
                //Open the exporter
                exp.open(title);
                if (data.length) {
                    //set label
                    exp.row(Object.keys(data[0]._data));
                    //set the data
                    expect(data).each(function(item) {
                        exp.row(getValueInArray(item._data));
                    });
                }
            }

            //close the exporter
            return exp.close();
        }
    });
};