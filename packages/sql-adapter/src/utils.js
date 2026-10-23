function noop() { }

/**
 *
 * @param {*} err
 */
function logError(err) {
    console.group('JDB SQL_ADAPTER');
    console.log(err);
    console.groupEnd();
}

// rows written before values were JSON-encoded hold raw strings
function jsonParserTypes(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}
