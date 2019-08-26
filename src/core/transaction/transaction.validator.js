/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 * @param {*} columns 
 */
function TransactionDataAndColumnValidator(tableName, columns) {
    var _this = this,
        _typeValidator = privateApi.$getActiveDB(this.DB_NAME).$get('dataTypes');
    /**
     * 
     * @param {*} cData 
     * @param {*} dataRef 
     */
    return function(cData, dataRef) {
        //Process the Data
        var passed = 1;
        if (cData) {
            Object.keys(cData).forEach(function(key) {
                //check if column is in table
                if (!columns[key]) {
                    //throw new error
                    _this.setDBError('column (' + key + ') was not found on this table (' + tableName + '), to add a new column use the addColumn FN - ref #' + dataRef);
                    passed = !1;
                    return;
                }

                var type = typeof cData[key],
                    requiredType = (columns[key].type || 'string').toUpperCase();
                if (!_typeValidator.validate(cData[key], requiredType)) {
                    /**
                     * Allow null value when NOT_NULL is not configured 
                     */
                    if ($isNull(cData[key]) && !columns[key].NOT_NULL) {
                        return;
                    }
                    _this.setDBError(key + " Field requires " + requiredType.toUpperCase() + ", but got " + type.toUpperCase() + "(" + cData[key] + ")- ref #" + dataRef);
                    passed = !1;
                }
            });

            return passed;
        }

        return !1;
    };

}

function columnObjFn(columns) {
    var obj = {};

    function _dbDefaultValueMatcher(def) {
        if (def.hasOwnProperty('defaultValue')) {
            if (def.defaultValue == "CURRENT_TIMESTAMP") {
                return +new Date;
            } else if (def.defaultValue == "DATE_TIME") {
                return new Date().toLocaleString();
            } else if (def.defaultValue == "DATE") {
                return new Date().toLocaleDateString();
            } else {
                return def.defaultValue;
            }
        }

        return def.NOT_NULL ? "" : null;
    };

    findInList.call(columns, function(prop, value) {
        obj[prop] = _dbDefaultValueMatcher(value);
    });

    return obj;
}