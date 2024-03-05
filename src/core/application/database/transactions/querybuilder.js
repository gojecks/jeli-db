/**
 * 
 * @param {*} context 
 */
function generateQuickSearchApi(context) {
    if (!context.isMultipleTable) {
        var tableColumns = Object.keys(context.getTableInfo().columns[0])
        for (var i = 0; i < tableColumns.length; i++) {
            this['findby' + tableColumns[i]] = buildQuery(tableColumns[i]);
        }
    } else {
        this.findByColumn = buildQuery;
    }

    /**
     * 
     * @param {*} columnName 
     * @returns 
     */
    function buildQuery(columnName) {
        var query = {};
        query[columnName] = {
            type: "isEqual",
            value: null
        };

        return function(value, table) {
            if (isMultipleTable && !table) {
                errorBuilder('Current state is having multiple table, please specify the table');
            }
            /**
             * set the query value
             */
            query[columnName].value = value;

            return context.select('*', { where: query }).execute();
        }
    }
}