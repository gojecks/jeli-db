//Query DB
ApplicationInstance.prototype.transaction = function(table, mode) {
    var dbName = this.name;
    //getRequired Table Fn
    function getRequiredTable(cTable) {
        if (!privateApi.$getActiveDB(dbName).$get('$tableExist')(cTable)) {
            err.push("There was an error, Table (" + table + ") was not found on this DB (" + dbName + ")");
            return;
        }

        return privateApi.$getTable(dbName, cTable);
    }

    function validateTableSchema(tableData, table) {
        if (!tableData.hasOwnProperty('columns') || !$isEqual(tableData.DB_NAME, dbName) || !$isEqual(tableData.TBL_NAME, table)) {
            err.push("Table (" + table + ") is not well configured, if you re the owner please delete the table and create again");
        }
    }

    // create a new defer state
    var defer = new _Promise();
    if (table) {
        var tableData = null,
            err = [],
            isMultipleTable = false,
            tableJoinMapping = {};

        //required table is an array
        if ($isArray(table)) {
            tableData = {};
            var c = table.length;
            while (c--) {
                var tbl = table[c],
                    saveName = tbl;
                if ($inArray(' as ', tbl)) {
                    var spltTbl = tbl.split(' as ');
                    spltTbl.forEach(function(item, idx) {
                        spltTbl[idx] = $removeWhiteSpace(item);
                        return 1;
                    });

                    tbl = spltTbl.shift();
                    saveName = spltTbl.pop();
                    tableJoinMapping[tbl] = saveName;
                }

                tableData[saveName] = getRequiredTable(tbl);
                validateTableSchema(tableData[saveName], tbl);
            }

            //change mode to read
            mode = "read";
            isMultipleTable = true;
        } else {
            tableData = getRequiredTable(table);
            validateTableSchema(tableData, table);
            tableJoinMapping[table] = null;
        }

        // validate tableSchema


        if (err.length) {
            defer.reject({ message: err.join("\n"), errorCode: 401 });
        } else {
            defer.resolve({ result: new jTblQuery(tableData, mode, isMultipleTable, tableJoinMapping), tables: table, mode: mode });
        }
    }

    return new DBPromise(defer);
};