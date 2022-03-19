//Query DB
var transactionManager = new TransactionManager();

/**
 * 
 * @param {*} table 
 * @param {*} mode 
 */
function ApplicationInstanceTransaction(table, mode) {
    var dbName = this.name;
    var tableSchema = null;
    var err = [];
    var isMultipleTable = false;
    var tableJoinMapping = {};

    /**
     * 
     * @param {*} table 
     */
    function validateTableSchema(table) {
        var tableSchema = privateApi.getTable(dbName, table);
        if (!tableSchema) {
            err.push("There was an error, Table (" + table + ") was not found on this DB (" + dbName + ")");
            return;
        }

        if (!tableSchema.columns || !$isEqual(tableSchema.DB_NAME, dbName) || !$isEqual(tableSchema.TBL_NAME, table)) {
            err.push("Table (" + table + ") is not well configured, if you re the owner please delete the table and create again");
        }
    }

    return new DBPromise(function(resolve, reject) {
        if (table) {
            //required table is an array
            if ($isArray(table)) {
                tableSchema = {};
                table.forEach(function(tbl) {
                    tbl = tbl.split(' as ').map(trim);
                    if (tbl.length > 1) {
                        tableJoinMapping[tbl[1]] = tbl[0];
                    } else {
                        tableJoinMapping[tbl[0]] = tbl[0];
                    }

                    validateTableSchema(tbl[0], tbl);
                });
                //change mode to read
                isMultipleTable = true;
            } else {
                validateTableSchema(table);
                tableJoinMapping[table] = table;
            }

            if (err.length) {
                reject({
                    message: err.join("\n"),
                    errorCode: 400
                });
            } else {
                resolve({
                    result: new TableTransaction(tableJoinMapping, mode, isMultipleTable, dbName),
                    tables: table,
                    mode: mode
                });
            }
        }
    });
};