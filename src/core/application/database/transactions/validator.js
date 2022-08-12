/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 * @param {*} columns 
 */
function TransactionDataAndColumnValidator(tableName, columns) {
    var _this = this,
        _typeValidator = privateApi.getActiveDB(this.DB_NAME).get(constants.DATATYPES);
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

function getDefaultColumnValue(defaultValue, ref) {
    var date = (new Date);
    if (defaultValue == "CURRENT_TIMESTAMP") {
        return +date;
    } else if (defaultValue == "DATE_TIME") {
        return date.toLocaleString();
    } else if (defaultValue == "DATE") {
        return date.toLocaleDateString();
    } else if (defaultValue == "UUID") {
        return ref;
    } else if (defaultValue == "RID") {
        // default to 6 for now, allow users to change weight
        return randomStringGenerator(6)
    } else {
        return defaultValue;
    }
}

function columnObjFn(columns) {
    function parser(data, ref) {
        return parser.columnKeys.reduce(function(accum, prop) {
            var def = columns[prop];
            var value = null;
            var hasProp = data.hasOwnProperty(prop);
            if (def.defaultValue && (!hasProp || (hasProp && data[prop] == null || data[prop] === undefined))) {
                value = getDefaultColumnValue(def.defaultValue, ref);
            } else {
                value = hasProp ? data[prop] : def.NOT_NULL ? "" : null
            }

            accum[prop] = value;
            return accum;
        }, {});
    };

    parser.columnKeys = Object.keys(columns);
    return parser;
}