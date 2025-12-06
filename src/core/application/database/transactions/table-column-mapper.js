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
function tableModelMapper(tableInfo) {
    var columnKeys = Object.keys(tableInfo.columns[0] || {});
    function parser(data, ref) {
        data = (data || {});
        return columnKeys.reduce(function(accum, prop) {
            var def = tableInfo.columns[0][prop];
            var hasProp = data.hasOwnProperty(prop);
            var value = hasProp ? data[prop] : def.NOT_NULL ? '' : null;
            if (def.defaultValue && (!hasProp || (hasProp && [null, undefined, ''].includes(value)))) {
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