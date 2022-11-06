/**
 * 
 * @param {*} tableInfo 
 */
function TableInstance(dbName, tableName) {
    this.tableInfo = privateApi.getTable(dbName, tableName);
    this.alter = new TableAlterInstance(this.tableInfo);
    Object.defineProperties(this, {
        columns: {
            get: function() {
                return jEliDeepCopy(this.tableInfo.columns[0]);
            }
        },
        info: {
            get: function() {
                return {
                    _DBNAME_: dbName,
                    tableName: tableName
                };
            }
        }
    });
}

/**
 * 
 * @param {*} tableData 
 */
TableInstance.prototype.update = function(tableData) {
    privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        if (tableData.columns && !Array.isArray(tableData.columns)) {
            tableData.columns = [tableData.columns];
        }

        Object.assign(table, tableData);
    });
};

TableInstance.prototype.drop = function(flag) {
    if (!flag) {
        return dbErrorPromiseObject("Table (" + this.tableInfo.TBL_NAME + ") Was not found in " + this.tableInfo.DB_NAME + " DataBase or invalid flag passed");
    }

    if (!this.tableInfo.TBL_NAME && !this.tableInfo._hash) {
        return dbErrorPromiseObject("Invalid Table record passed, please try again.");
    }

    //update the deletedRecords
    var $resource = privateApi.getActiveDB(this.tableInfo.DB_NAME).get(constants.RESOURCEMANAGER);
    if ($resource.getTableLastSyncDate(this.tableInfo.TBL_NAME)) {
        privateApi.updateDeletedRecord('table', {
            name: this.tableInfo.TBL_NAME,
            _hash: this.tableInfo._hash,
            db: this.tableInfo.DB_NAME
        });
    }

    $resource.removeTableFromResource(this.tableInfo.TBL_NAME);
    TableInstance.factory.remove(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME);

    /**
      broadcast event
    **/
    privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.DROP_TABLE, [this.tableInfo.TBL_NAME]);

    return dbSuccessPromiseObject("drop", "Table (" + this.tableInfo.TBL_NAME + ") was dropped successfully");
};


TableInstance.prototype.truncate = function(flag) {
    //empty the table
    if (!flag) {
        return dbErrorPromiseObject("Table (" + this.tableInfo.TBL_NAME + ") Was not found in " + this.tableInfo.DB_NAME + " DataBase or invalid flag passed");
    }

    // update the DB
    var tableData = privateApi.getTableData(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME);
    tableData.length = 0;
    privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        table._hash = "";
        table._records = table.lastInsertId = 0;
    });

    /**
     * broadcast event
     */
    privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.TRUNCATE_TABLE, [this.tableInfo.TBL_NAME]);
    return dbSuccessPromiseObject("truncate", this.tableInfo.TBL_NAME + " was truncated");
};

/**
 * Rename Table
 */
TableInstance.prototype.rename = function(newTableName) {
    if (!newTableName && isequal(newTableName, this.tableInfo.TBL_NAME)) {
        return dbErrorPromiseObject("Invalid TABLE NAME");
    }
    var db = privateApi.getActiveDB(this.tableInfo.DB_NAME);
    // rename the tableInfo
    if (privateApi.tableExists(this.tableInfo.DB_NAME, newTableName)) {
        return "Table already exists";
    }

    var oldTableName = this.tableInfo.TBL_NAME;
    //update the deletedRecords
    var $resource = db.get(constants.RESOURCEMANAGER);
    if ($resource.getTableLastSyncDate(oldTableName)) {
        privateApi.updateDeletedRecord('rename', {
            oldName: oldTableName,
            newName: newTableName,
            _hash: this.tableInfo._hash,
            db: this.tableInfo.DB_NAME
        });
    }

    /**
     * broadcastEvent
     */
    privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.RENAME_TABLE, [oldTableName, newTableName]);
    $resource.renameTableResource(oldTableName, newTableName);
    this.info.tableName = newTableName;
    /**
     * updated storage
     */
    privateApi.updateDB(this.tableInfo.DB_NAME, newTableName);
    TableInstance.factory.rename(this.tableInfo.DB_NAME, oldTableName, this.tableInfo.TBL_NAME);

    return dbSuccessPromiseObject("rename", "Table renamed successfully");
};

TableInstance.factory = (function() {
    var tableInstances = new Map();
    return Object.create({
        /**
         * 
         * @param {*} dbName 
         * @param {*} tableName 
         * @returns 
         */
        add: function(dbName, tableName) {
            var cName = dbName + ":" + tableName;
            if (!tableInstances.has(cName)) {
                tableInstances.set(cName, new TableInstance(dbName, tableName));
            }

            return tableInstances.get(cName);
        },
        /**
         * 
         * @param {*} dbName 
         * @param {*} tableName 
         */
        remove: function(dbName, tableName) {
            tableInstances.delete(dbName + ":" + tableName);
        },
        rename: function(dbName, oldName, tableName) {
            if (tableInstances.has(dbName + ":" + oldName)) {
                tableInstances.set(dbName + ":" + tableName, tableInstances.get(dbName + ":" + oldName));
                this.remove(dbName, oldName);
            }
        }
    });
})();