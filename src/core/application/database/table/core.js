/**
 * 
 * @param {*} tableInfo 
 */
class TableInstance {
    static tableInstances = new Map();
    static factory = Object.create({
        getName: (a, b) => {
            return a + ":" + b;
        },
        /**
         * 
         * @param {*} dbName 
         * @param {*} tableName 
         * @returns 
         */
        add: function(dbName, tableName) {
            var cName = this.getName(dbName, tableName);
            if (!TableInstance.tableInstances.has(cName) && privateApi.tableExists(dbName, tableName)) {
                TableInstance.tableInstances.set(cName, new TableInstance(dbName, tableName));
            }

            return TableInstance.tableInstances.get(cName);
        },
        /**
         * 
         * @param {*} dbName 
         * @param {*} tableName 
         */
        remove: function(dbName, tableName) {
            TableInstance.tableInstances.delete(this.getName(dbName, tableName));
        },
        rename: function(dbName, oldName, tableName) {
            var instance = TableInstance.tableInstances.get(this.getName(dbName, oldName));
            if (instance) {
                TableInstance.tableInstances.set(this.getName(dbName,tableName), instance);
                this.remove(dbName, oldName);
                instance = null;
            }
        }
    });
    
    constructor(dbName, tableName) {
        this.tableInfo = privateApi.getTable(dbName, tableName);
        this.alter = new TableAlterInstance(this.tableInfo);
        this.info = {
            _DBNAME_: dbName,
            tableName
        };
    }

    get columns() {
        return jEliDeepCopy(this.tableInfo.columns[0]);
    }

    getModel(data){
        return tableModelMapper(this.tableInfo)(data);
    }

    /**
     * 
     * @param {*} tableData 
     */
    update(tableData) {
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function (table) {
            if (tableData.columns && !Array.isArray(tableData.columns)) {
                tableData.columns = [tableData.columns];
            }

            Object.assign(table, tableData);
        });
    };

    drop(flag) {
        const dbName = this.info._DBNAME_;
        const tblName = this.info.tableName;

        if (!flag) {
            return dbErrorPromiseObject(`Table (${dbName}) Was not found in ${tblName} DataBase or invalid flag passed`);
        }

        if (!tblName && !this.tableInfo?._hash) {
            return dbErrorPromiseObject("Invalid Table record passed, please try again.");
        }

        //update the deletedRecords
        var $resource = privateApi.getActiveDB(dbName).get(constants.RESOURCEMANAGER);
        if ($resource.getTableLastSyncDate(tblName)) {
            privateApi.updateDeletedRecord('table', {
                name: tblName,
                _hash: this.tableInfo?._hash,
                db: dbName
            });
        }

        $resource.removeTableFromResource(tblName);
        TableInstance.factory.remove(dbName, tblName);

        /**
          broadcast event
        **/
        privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.DROP_TABLE, [tblName]);

        return dbSuccessPromiseObject("drop", `Table (${tblName}) was dropped successfully`);
    };


    truncate(flag) {
        //empty the table
        if (!flag) {
            return dbErrorPromiseObject(`Table (${this.tableInfo.TBL_NAME}) Was not found in ${this.tableInfo.DB_NAME} DataBase or invalid flag passed`);
        }
    
        privateApi.truncateTable(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME);
        return dbSuccessPromiseObject('truncate', `${this.tableInfo.TBL_NAME} was truncated`);
    };

    /**
     * Rename Table
     */
    rename(newTableName) {
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
}