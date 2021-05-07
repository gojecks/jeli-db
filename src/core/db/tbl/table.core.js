/**
 * 
 * @param {*} tableInfo 
 */
function TableInstance(dbName, tableName) {
    tableInfo = privateApi.getTable(dbName, tableName);
    this.Alter = new TableAlterInstance(tableInfo);
    this.onUpdate = RealtimeAbstract.createInstance({
        type: 'tbl',
        dbName: dbName,
        tableName: tableName,
        hash: tableInfo._hash
    }, privateApi.getNetworkResolver('enableSocket', dbName));

    Object.defineProperties(this, {
        tableInfo: {
            get: function() {
                return tableInfo;
            }
        },
        info: {
            get: function() {
                return ({
                    _DBNAME_: dbName,
                    tableName: tableName
                });
            }
        },
        columns: {
            get: function() {
                return jEliDeepCopy(tableInfo.columns[0]);
            }
        }
    });
}

TableInstance.prototype.drop = function(flag) {
    if (!flag) {
        return dbErrorPromiseObject("Table (" + this.tableInfo.TBL_NAME + ") Was not found in " + this.tableInfo.DB_NAME + " DataBase or invalid flag passed");
    }

    if (!this.tableInfo.TBL_NAME && !this.tableInfo._hash) {
        return dbErrorPromiseObject("Invalid Table record passed, please try again.");
    }

    //update the deletedRecords
    var $resource = privateApi.getActiveDB(this.tableInfo.DB_NAME).get('resourceManager');
    if ($resource.getTableLastSyncDate(this.tableInfo.TBL_NAME)) {
        privateApi.$taskPerformer.updateDeletedRecord('table', {
            name: this.tableInfo.TBL_NAME,
            _hash: this.tableInfo._hash,
            db: this.tableInfo.DB_NAME
        });
    }

    $resource.removeTableFromResource(this.tableInfo.TBL_NAME);
    /**
      broadcast event
    **/
    privateApi.storageEventHandler.broadcast(eventNamingIndex(this.tableInfo.DB_NAME, 'onDropTable'), [this.tableInfo.TBL_NAME]);

    return dbSuccessPromiseObject("drop", "Table (" + this.tableInfo.TBL_NAME + ") was dropped successfully");
};


TableInstance.prototype.truncate = function(flag) {
    //empty the table
    if (!flag) {
        return dbErrorPromiseObject("Table (" + this.tableInfo.TBL_NAME + ") Was not found in " + this.tableInfo.DB_NAME + " DataBase or invalid flag passed");
    }

    //update the DB
    this.tableInfo.data.length = 0;
    jdbUpdateStorage(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function(table) {
        table._hash = "";
        table._records = table.lastInsertId = 0;
    });

    /**
     * broadcast event
     */
    privateApi.storageEventHandler.broadcast(eventNamingIndex(this.tableInfo.DB_NAME, 'onTruncateTable'), [this.tableInfo.TBL_NAME]);

    return dbSuccessPromiseObject("truncate", this.tableInfo.TBL_NAME + " was truncated");
};

/**
 * Rename Table
 */
TableInstance.prototype.rename = function(newTableName) {
    if (!newTableName && $isEqual(newTableName, this.tableInfo.TBL_NAME)) {
        return dbErrorPromiseObject("Invalid TABLE NAME");
    }
    var db = privateApi.getActiveDB(this.tableInfo.DB_NAME);
    // rename the tableInfo
    if (db.get('$tableExist')(newTableName)) {
        return "Table already exists";
    }

    //update the deletedRecords
    var $resource = db.get('resourceManager');
    if ($resource.getTableLastSyncDate(this.tableInfo.TBL_NAME)) {
        privateApi.$taskPerformer.updateDeletedRecord('rename', {
            oldName: this.tableInfo.TBL_NAME,
            newName: newTableName,
            _hash: this.tableInfo._hash,
            db: this.tableInfo.DB_NAME
        });
    }

    /**
     * broadcastEvent
     */
    privateApi.storageEventHandler.broadcast(eventNamingIndex(this.tableInfo.DB_NAME, 'onRenameTable'), [this.tableInfo.TBL_NAME, newTableName]);
    $resource.renameTableResource(info.tableName, newTableName);
    info.tableName = newTableName;
    /**
     * updated storage
     */
    jdbUpdateStorage(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME);

    return dbSuccessPromiseObject("rename", "Table renamed successfully");
};

TableInstance.factory = (function() {
    var tableInstances = new Map();
    return function(dbName, tableName) {
        var cName = dbName + ":" + tableName;
        if (!tableInstances.has(cName)) {
            tableInstances.set(cName, new TableInstance(dbName, tableName));
        }

        return tableInstances.get(cName);
    };
})();