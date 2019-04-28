/**
 * 
 * @param {*} tableInfo 
 */
function jEliDBTBL(tableInfo) {
    var info = {
        _DBNAME_: tableInfo.DB_NAME,
        tableName: tableInfo.TBL_NAME
    };


    this.info = info;
    this.Alter = {};
    this.Alter.drop = function(columnName) {
        if ($isString(columnName) && tableInfo.columns[0][columnName]) {
            delete tableInfo.columns[0][columnName];
        }
        //reconstruct the table
        constructTable(function(row) {
            if (row._data.hasOwnProperty(columnName)) {
                delete row._data[columnName];
            }
        });

        /**
            broadcast event
        **/
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'update'), [tableInfo.TBL_NAME, tableInfo.data]);
        //update the DB
        jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
    };

    this.Alter.add = ({
        primary: primaryAction,
        unique: indexAction,
        foreign: foreignAction,
        mode: modeAction,
        column: columnAction,

    });

    /**
     * Rename Table
     */
    this.Alter.rename = function(newTableName) {
        if (newTableName && !$isEqual(newTableName, tableInfo.TBL_NAME)) {
            // rename the tableInfo
            if (privateApi.$getActiveDB(tableInfo.DB_NAME).$get('$tableExist')(newTableName)) {
                return "Table already exists";
            }

            //update the deletedRecords
            var $resource = privateApi.$getActiveDB(tableInfo.DB_NAME).$get('resourceManager');
            if ($resource.getTableLastSyncDate(tableInfo.TBL_NAME)) {
                privateApi.$taskPerformer.updateDeletedRecord('rename', {
                    oldName: tableInfo.TBL_NAME,
                    newName: newTableName,
                    _hash: tableInfo._hash,
                    db: tableInfo.DB_NAME
                });
            }

            $resource.renameTableResource(tableInfo.TBL_NAME, newTableName);
            privateApi.replicateTable(tableInfo.DB_NAME, tableInfo.TBL_NAME, newTableName, true);
            /**
             * broadcastEvent
             */
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onRenameTable'), [tableInfo.TBL_NAME, newTableName]);
            info.tableName = tableInfo.TBL_NAME = newTableName;
            /**
             * updated storage
             */
            jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);

            return dbSuccessPromiseObject("rename", "Table renamed successfully");
        }

        return dbErrorPromiseObject("Invalid TABLE NAME");
    };

    //get All the column
    this.columns = function() {
        return jEliDeepCopy(tableInfo.columns[0]);
    };

    this.truncate = function(flag) {
        //empty the table
        if (!flag) {
            return dbErrorPromiseObject("Table (" + tableInfo.TBL_NAME + ") Was not found in " + tableInfo.DB_NAME + " DataBase or invalid flag passed");
        }

        //update the DB
        jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.data = [];
            table._hash = "";
            table._records = table.lastInsertId = 0;
            /**
                broadcast event
            **/
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onTruncateTable'), [tableInfo.TBL_NAME]);
        });

        return dbSuccessPromiseObject("truncate", tableInfo.TBL_NAME + " was truncated");
    };

    this.drop = function(flag) {
        if (!flag) {
            return dbErrorPromiseObject("Table (" + tableInfo.TBL_NAME + ") Was not found in " + tableInfo.DB_NAME + " DataBase or invalid flag passed");
        }

        if (!tableInfo.TBL_NAME && !tableInfo._hash) {
            return dbErrorPromiseObject("Invalid Table record passed, please try again.");
        }

        //update the deletedRecords
        var $resource = privateApi.$getActiveDB(tableInfo.DB_NAME).$get('resourceManager');
        if ($resource.getTableLastSyncDate(tableInfo.TBL_NAME)) {
            privateApi.$taskPerformer.updateDeletedRecord('table', {
                name: tableInfo.TBL_NAME,
                _hash: tableInfo._hash,
                db: tableInfo.DB_NAME
            });
        }

        $resource.removeTableFromResource(tableInfo.TBL_NAME);
        /**
          broadcast event
        **/
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onDropTable'), [tableInfo.TBL_NAME]);

        //delete the table from DB
        privateApi.removeTable(tableInfo.TBL_NAME, tableInfo.DB_NAME, true);

        return dbSuccessPromiseObject("drop", "Table (" + tableInfo.TBL_NAME + ") was dropped successfully");
    };


    this.onUpdate = new ApplicationRealtime('table', tableInfo.DB_NAME, tableInfo.TBL_NAME, tableInfo._hash);

    //Table constructor
    function constructTable(cFn) {
        expect(tableInfo.data).each(function(item, idx) {
            //perform task if argument is a function
            if ($isFunction(cFn)) {
                cFn(item);
            }
            //Update the dataSet
            tableInfo.data[idx]._data = extend(columnObjFn(tableInfo.columns[0]), item._data);
        });
    }

    /**
     * 
     * @param {*} key 
     */
    function primaryAction(key) {
        if (key && tableInfo.columns[0][key]) {
            tableInfo.primaryKey = key;
            tableInfo.columns[0][key].primaryKey = true;
            //update the DB
            jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        }

        return this;
    }

    /**
     * 
     * @param {*} key 
     * @param {*} tableName 
     */
    function foreignAction(key, tableName) {
        if (key && tableName && tableInfo.columns[0][key]) {
            if (!tableInfo.foreignKey && privateApi.$getActiveDB(tableInfo.DB_NAME).$get('$tableExist')(tableName)) {
                tableInfo.foreignKey = {
                    key: key,
                    table: tableName
                };
            }
            //update the DB
            jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        }

        return this
    }

    /**
     * 
     * @param {*} columnName 
     * @param {*} config 
     */
    function columnAction(columnName, config) {
        if (columnName && ($isObject(columnName) || $isString(columnName))) {
            var nColumn = columnName;
            if ($isString(nColumn)) {
                nColumn = {};
                nColumn[columnName] = config ? config : {};
            }

            tableInfo.columns[0] = extend(true, tableInfo.columns[0], nColumn);
            //reconstruct the table
            constructTable();

            /**
                 broadcast event
             **/
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'update'), [tableInfo.TBL_NAME, tableInfo.data]);
            //update the DB
            jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        }

        return this;
    }

    function indexAction(name, setting) {
        tableInfo.index[name] = setting || { unique: false };
    }

    function modeAction(mode) {
        if (!tableInfo.allowedMode[mode]) {
            tableInfo.allowedMode[mode] = 1;
            //update the DB
            jEliUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        }
    }
}