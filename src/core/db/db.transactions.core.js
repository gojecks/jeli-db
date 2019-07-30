//Query DB
var transactionManager = {
    _records: {},
    add: function(db, tbl, definition) {
        if (!this._records.hasOwnProperty(db)) {
            this._records[db] = {};
        };

        this._records[db][tbl] = definition;
    },
    has: function(db, tbl) {
        return this._records.hasOwnProperty(db) && this._records[db].hasOwnProperty(tbl);
    },
    remove: function(db, tbl) {
        if (this.has(db, tbl)) {
            delete this._records[db][tbl];
        }
    }
};


ApplicationInstance.prototype.transaction = function(table, mode) {
    var dbName = this.name,
        defer = new _Promise(),
        promise = new DBPromise(defer);
    //getRequired Table Fn
    function getRequiredTable(cTable) {
        if (!privateApi.$getActiveDB(dbName).$get('$tableExist')(cTable)) {
            err.push("There was an error, Table (" + table + ") was not found on this DB (" + dbName + ")");
            return;
        }

        return privateApi.$getTable(dbName, cTable);
    }

    function validateTableSchema(tableData, table) {
        if (!tableData || !tableData.columns || !$isEqual(tableData.DB_NAME, dbName) || !$isEqual(tableData.TBL_NAME, table)) {
            err.push("Table (" + table + ") is not well configured, if you re the owner please delete the table and create again");
        }
    }

    // create a new defer state
    var tableData = null,
        err = [],
        isMultipleTable = false,
        tableJoinMapping = {};
    if (table) {
        //required table is an array
        if ($isArray(table)) {
            tableData = {};
            table.forEach(function(tbl) {
                tbl = tbl.trim();
                var saveName = tbl;
                if ($inArray(' as ', tbl)) {
                    var spltTbl = tbl.split(' as ')
                        .map(function(key) {
                            return key.trim();
                        });

                    tbl = spltTbl.shift();
                    saveName = spltTbl.pop();
                    tableJoinMapping[tbl] = saveName;
                } else {
                    tableJoinMapping[tbl] = tbl;
                }

                tableData[saveName] = getRequiredTable(tbl);
                validateTableSchema(tableData[saveName], tbl);
            });
            //change mode to read
            isMultipleTable = true;
        } else {
            tableData = getRequiredTable(table);
            validateTableSchema(tableData, table);
            tableJoinMapping[table] = null;
            table = [table];
        }

        // set the tables
        tableJoinMapping._ = table;
        if (err.length) {
            defer.reject({ message: err.join("\n"), errorCode: 400 });
        } else {
            defer.resolve({ result: new jTblQuery(tableData, mode, isMultipleTable, tableJoinMapping, dbName), tables: table, mode: mode });
        }
    }

    return promise;
};