//Query DB
DBEvent.prototype.transaction = function(table, mode) {
    var dbName = this.name;
    //getRequired Table Fn
    function getRequiredTable(cTable) {
        if (!$queryDB.$getActiveDB(dbName).$get('$tableExist')(cTable)) {
            err.push("There was an error, Table (" + table + ") was not found on this DB (" + dbName + ")");
            return;
        }

        return $queryDB.$getTable(dbName, cTable);
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
                if (expect(tbl).contains(' as ')) {
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
            }

            //change mode to read
            mode = "read";
            isMultipleTable = true;
        } else {
            tableData = getRequiredTable(table);
            tableJoinMapping[table] = null;
        }


        if (err.length) {
            defer.reject({ message: err.join("\n"), errorCode: 401 });
        } else {
            defer.resolve({ result: new jTblQuery(tableData, mode, isMultipleTable, tableJoinMapping), tables: table, mode: mode });
        }
    }

    return new DBPromise(defer);
};