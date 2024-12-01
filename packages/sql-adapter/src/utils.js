/**
 * 
 * @param {*} data 
 */
function deepClone(data) {
    return JSON.parse(JSON.stringify(data));
}

/**
 * 
 * @param {*} data 
 */
function isArray(data) {
    return toString.call(data) === "[object Array]";
}

/**
 * 
 * @param {*} tx 
 * @param {*} txError 
 */
function logError(tx, txError) {
    console.group('JDB SQL_ADAPTER');
    console.log(txError);
    console.groupEnd();
}