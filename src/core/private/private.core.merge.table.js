/**
 * 
 * @param {*} dbName 
 * @param {*} records 
 * @param {*} tbl 
 */
_privateApi.prototype.$mergeTable = function(dbName, records, tbl) {
    var _Promiseromise = new _Promise();
    if ($isObject(records) && tbl) {
        var $dDB = this.$get(dbName);
        if ($dDB && $dDB.tables[tbl]) {
            // check for previous records
            if (!records.data && $dDB.tables[tbl].data) {
                records.data = $dDB.tables[tbl].data;
            }

            this.$newTable(dbName, tbl, records);
            _Promiseromise.resolve({ status: 'success', message: 'Table(' + tbl + ') updated successfully', code: 200 });
        } else {
            _Promiseromise.reject({ status: 'error', message: 'Unable to merge Table(' + tbl + ')', code: 403 });
        }
    } else {
        //undefined Table and Records
        _Promiseromise.reject({ status: 'error', message: 'Undefined Records and Table', code: 404 });
    }

    return _Promiseromise;
};