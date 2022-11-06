/**
 * 
 * @param {*} tableInfo 
 */
function TableAlterInstance(tableInfo) {
    this.add = new TableAlterAddInstance(tableInfo);
    Object.defineProperty(this, 'tableInfo', {
        get: function() {
            return tableInfo;
        }
    });
}

/**
 * 
 * @param {*} columnName 
 * @returns 
 */
TableAlterInstance.prototype.drop = function(columnName) {
    var _this = this;
    /**
     * check if columnName already exists
     */
    if (!this.tableInfo.columns[0].hasOwnProperty(columnName)) {
        return 0;
    }

    if (isstring(columnName) && this.tableInfo.columns[0][columnName]) {
        delete this.tableInfo.columns[0][columnName];
    }

    //reconstruct the table
    TableAlterAddInstance.constructTable(function(row) {
        if (row._data.hasOwnProperty(columnName)) {
            delete row._data[columnName];
        }
    }, this.tableInfo);

    //update the DB
    privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        table.columns = _this.tableInfo.columns
    });

    /**
     * broadcast event
     **/
    privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.ALTER_TABLE, [this.tableInfo.TBL_NAME, columnName, 0]);
};

/**
 * 
 * @param {*} oldName 
 * @param {*} newName 
 * @returns 
 */
TableAlterInstance.prototype.rename = function(oldName, newName) {
    /**
     * check if columnName already exists
     */
    if (!this.tableInfo.columns[0].hasOwnProperty(oldName)) {
        console.log('[JDB TABLE ALTER]: Column(' + oldName + ') doesn\'t exists');
        return 0;
    }

    if (this.tableInfo.columns[0].hasOwnProperty(newName)) {
        console.log('[JDB TABLE ALTER]: Column(' + newName + ') already exists');
        return 0;
    }

    if (isequal(newName.toLowerCase(), oldName.toLowerCase())) {
        console.log('[JDB TABLE ALTER]: Duplicate columnName (' + newName + ')');
        return 0;
    }

    // start process
    this.tableInfo.columns[0][newName] = this.tableInfo.columns[0][oldName];
    // remve the existing data
    delete this.tableInfo.columns[0][oldName];

    //update the DB
    var _this = this;
    privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        table.columns = _this.tableInfo.columns
    });

    //reconstruct the table data
    TableAlterAddInstance.constructTable(function(row) {
        if (row._data.hasOwnProperty(oldName)) {
            row._data[newName] = row._data[oldName];
            delete row._data[oldName];
        }
    }, tableInfo);

    /**
     * broadcast event
     **/
    privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.ALTER_TABLE, [this.tableInfo.TBL_NAME, [oldName, newName], 0]);
};

TableAlterAddInstance.constructTable =
    /**
     * 
     * @param {*} cFn 
     * @param {*} tableInfo 
     */
    function(cFn, tableInfo) {
        var defaultValueGenerator = columnObjFn(tableInfo.columns[0]);
        var tableData = privateApi.getTableData(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        tableData.forEach(function(item, idx) {
            //perform task if argument is a function
            if (isfunction(cFn)) {
                cFn(item);
            }
            //Update the dataSet
            tableData[idx]._data = defaultValueGenerator(item._data, item._ref);
        });
    };

function TableAlterAddInstance(tableInfo) {
    Object.defineProperty(this, 'tableInfo', {
        get: function() {
            return tableInfo;
        }
    });

    /**
     * 
     * @param {*} columnName 
     * @param {*} config 
     */
    this.column = function(columnName, config) {
        var isObjectColumnName = isobject(columnName);
        if (columnName && (isObjectColumnName || isstring(columnName))) {
            var nColumn = columnName;
            var notExists = !(tableInfo.columns[0] || {}).hasOwnProperty(columnName);

            if (!isObjectColumnName) {
                nColumn = {};
                nColumn[columnName] = isobject(config) ? config : {
                    type: 'any'
                };
            }

            //reconstruct the table
            tableInfo.columns[0] = Object.assign(tableInfo.columns[0] || {}, nColumn);
            /**
             * broadcast event to subscribers
             * only When column is new
             */
            if (!isObjectColumnName && notExists) {
                TableAlterAddInstance.constructTable(null, tableInfo);
                privateApi.storageFacade.broadcast(tableInfo.DB_NAME, DB_EVENT_NAMES.ALTER_TABLE, [tableInfo.TBL_NAME, columnName, 1]);
            }

            /**
             * update our database schema
             */
            privateApi.updateDB(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                table.columns = tableInfo.columns;
            });
        }

        return this;
    }
}

/**
 * 
 * @param {*} name 
 * @param {*} setting 
 */
TableAlterAddInstance.prototype.index = function(name, setting) {
    if (name || setting) {
        var indexData = isarray(this.tableInfo.index) ? {} : this.tableInfo.index;
        var columns = this.tableInfo.columns[0];
        if (isobject(name) && !setting) {
            for (var prop in name) {
                validateAndWrite(prop, name[prop]);
            }
        } else if (!setting && indexData[name]) {
            delete indexData[name];
        } else {
            validateAndWrite(name, setting);
        }
    }

    function validateAndWrite(a, b) {
        if (columns[a]) {
            if (!b && indexData[a]) {
                delete indexData[a];
            } else if (b && b.groupBy && !columns[b.groupBy]) {
                return
            } else {
                indexData[a] = b || { unique: false };
            }
        }
    }

    privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        table.index = indexData;
    });
};

/**
 * 
 * @param {*} mode 
 */
TableAlterAddInstance.prototype.mode = function(mode) {
    if (!this.tableInfo.allowedMode[mode]) {
        this.tableInfo.allowedMode[mode] = 1;
        //update the DB
        var _this = this;
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
            table.allowedMode = _this.tableInfo.allowedMode;
        });
    }
};

/**
 * 
 * @param {*} key 
 */
TableAlterAddInstance.prototype.primary = function(key) {
    if (key && this.tableInfo.columns[0][key]) {
        //update the DB
        var _this = this;
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
            _this.tableInfo.columns[0][key].PRIMARY_KEY = true;
            table.primaryKey = key;
            table.columns = _this.tableInfo.columns;
        });
    }

    return this;
};

/**
 * 
 * @param {*} key 
 * @param {*} tableName 
 */
TableAlterAddInstance.prototype.foreign = function(key, tableName) {
    if (key || tableName) {
        var foreignKeys = this.tableInfo.foreignKey || {};
        var columns = this.tableInfo.columns[0];
        var dbName = this.tableInfo.DB_NAME;

        if (isobject(key) && !tableName) {
            // validate before writing;
            for (var prop in key) {
                validateAndWrite(prop, key[prop]);
            }
        } else {
            validateAndWrite(key, tableName);
        }

        function validateAndWrite(a, b) {
            if (columns[a]) {
                if (!b && foreignKeys[a]) {
                    delete foreignKeys[a];
                } else if (privateApi.tableExists(dbName, b)) {
                    foreignKeys[a] = b;
                }
            }
        }

        //update the DB
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
            table.foreignKey = foreignKeys;
        });
    }

    return this
}