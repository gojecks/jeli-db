/**
 * 
 * @param {*} tableName 
 * @param {*} columns 
 * @param {*} callback 
 * @returns 
 */
function TransactionDataAndColumnValidator(tableName, columns, callback) {
    var  _typeValidator = privateApi.getActiveDB(this.DB_NAME).get(constants.DATATYPES);
    callback = callback || noop;

    /**
     * 
     * @param {*} cData 
     * @param {*} dataRef 
     */
    return (cData, dataRef) => {
        //Process the Data
        var passed = 1;
        if (cData) {
            var cdataKeys = Object.keys(cData);
            for(var key of cdataKeys){
                //check if column is in table
                if (!columns[key]) {
                    //throw new error
                    this.setDBError('column (' + key + ') was not found on this table (' + tableName + '), to add a new column use the addColumn FN - ref #' + dataRef);
                    callback(key);
                    passed = !1;
                    return;
                }

                var type = typeof cData[key];
                var requiredType = (columns[key].type || 'string').toUpperCase();

                if (!_typeValidator.validate(cData[key], requiredType)) {
                    /**
                     * Allow null value when NOT_NULL is not configured 
                     */
                    if (isnull(cData[key]) && !columns[key].NOT_NULL && !columns[key].required) continue;
                    
                    callback(key, requiredType, type);
                    this.setDBError(key + " Field requires " + requiredType.toUpperCase() + ", but got " + type.toUpperCase() + "(" + cData[key] + ")- ref #" + dataRef);
                    passed = !1;
                }
            }

            return passed;
        }

        return !1;
    };

}

/**
 * 
 * @param {*} defaultValue 
 * @param {*} ref 
 * @param {*} tableInfo 
 * @returns 
 */
function getDefaultColumnValue(defaultValue, ref, tableInfo) {
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
    } else if(defaultValue == 'AUTO_INCREMENT'){
        tableInfo.lastInsertId++;
        return tableInfo.lastInsertId;
    }else {
        return defaultValue;
    }
}

/**
 * 
 * @param {*} tableInfo 
 * @returns 
 */
function columnObjFn(tableInfo) {
    var columnKeys = Object.keys(tableInfo.columns[0]);
    function parser(data, ref) {
        return columnKeys.reduce(function(accum, prop) {
            var def = tableInfo.columns[0][prop];
            var hasProp = data.hasOwnProperty(prop);
            var value = hasProp ? data[prop] : def.NOT_NULL ? "" : null;
            if (def.defaultValue && (!hasProp || (hasProp && [null, undefined, ""].includes(value)))) {
                value = getDefaultColumnValue(def.defaultValue, ref, tableInfo);
            }

            accum[prop] = value;
            return accum;
        }, {});
    }

    parser.columnKeys = columnKeys;
    parser.cleanup = function(){
        columnKeys = null;
        tableInfo = null;
    };

    return parser;
}