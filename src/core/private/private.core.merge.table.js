/**
 * 
 * @param {*} dbName 
 * @param {*} records 
 * @param {*} tbl 
 */
_privateApi.prototype.$mergeTable = function(dbName, records, tbl) {
    var $promise = new $p();
    if ($isObject(records) && tbl) {
        var $dDB = this.$get(dbName);
        if ($dDB && $dDB.tables[tbl]) {
            // check for previous records
            if (!records.data && $dDB.tables[tbl].data) {
                records.data = $dDB.tables[tbl].data;
            }

            this.$newTable(dbName, tbl, records);
            $promise.resolve({ status: 'success', message: 'Table(' + tbl + ') updated successfully', code: 200 });
        } else {
            $promise.reject({ status: 'error', message: 'Unable to merge Table(' + tbl + ')', code: 403 });
        }
    } else {
        //undefined Table and Records
        $promise.reject({ status: 'error', message: 'Undefined Records and Table', code: 404 });
    }

    return $promise;
};