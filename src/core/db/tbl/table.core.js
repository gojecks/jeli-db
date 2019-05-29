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

        //update the DB
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.columns = tableInfo.columns
        });

        /**
         * broadcast event
         **/
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'update'), [tableInfo.TBL_NAME]);
    };

    this.Alter.add = ({
        primary: primaryAction,
        unique: indexAction,
        foreign: foreignAction,
        mode: modeAction,
        column: columnAction
    });

    /**
     * Rename Table
     */
    this.Alter.rename = function(newTableName) {
        if (newTableName && !$isEqual(newTableName, tableInfo.TBL_NAME)) {
            var db = privateApi.$getActiveDB(tableInfo.DB_NAME);
            // rename the tableInfo
            if (db.$get('$tableExist')(newTableName)) {
                return "Table already exists";
            }

            //update the deletedRecords
            var $resource = db.$get('resourceManager');
            if ($resource.getTableLastSyncDate(tableInfo.TBL_NAME)) {
                privateApi.$taskPerformer.updateDeletedRecord('rename', {
                    oldName: tableInfo.TBL_NAME,
                    newName: newTableName,
                    _hash: tableInfo._hash,
                    db: tableInfo.DB_NAME
                });
            }

            /**
             * broadcastEvent
             */
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onRenameTable'), [tableInfo.TBL_NAME, newTableName]);
            $resource.renameTableResource(info.tableName, newTableName);
            info.tableName = newTableName;
            /**
             * updated storage
             */
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME);

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
        tableInfo.data.length = 0;
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table._hash = "";
            table._records = table.lastInsertId = 0;
        });

        /**
         * broadcast event
         */
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onTruncateTable'), [tableInfo.TBL_NAME]);

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

        return dbSuccessPromiseObject("drop", "Table (" + tableInfo.TBL_NAME + ") was dropped successfully");
    };


    this.onUpdate = new ApplicationRealtime('table', tableInfo.DB_NAME, tableInfo.TBL_NAME, tableInfo._hash);

    //Table constructor
    function constructTable(cFn) {
        var columns = columnObjFn(tableInfo.columns[0]);
        tableInfo.data.forEach(function(item, idx) {
            //perform task if argument is a function
            if ($isFunction(cFn)) {
                cFn(item);
            }
            //Update the dataSet
            tableInfo.data[idx]._data = extend(true, columns, item._data);
        });
    }

    /**
     * 
     * @param {*} key 
     */
    function primaryAction(key) {
        if (key && tableInfo.columns[0][key]) {
            //update the DB
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                tableInfo.columns[0][key].primaryKey = true;
                table.primaryKey = key;
                table.columns = tableInfo.columns;
                table.columns[0][key].primaryKey = true;
            });
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
            if (privateApi.$getActiveDB(tableInfo.DB_NAME).$get('$tableExist')(tableName)) {
                //update the DB
                jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                    table.foreignKey = {
                        key: key,
                        table: tableName
                    }
                });
            }
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

            //reconstruct the table
            tableInfo.columns[0] = extend(true, tableInfo.columns[0], nColumn);
            constructTable();

            /**
             * broadcast event
             */
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'update'), [tableInfo.TBL_NAME]);
            //update the DB
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                table.columns = tableInfo.columns;
            });
        }

        return this;
    }

    function indexAction(name, setting) {
        tableInfo.index[name] = setting || { unique: false };
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.index = tableInfo.index;
        });
    }

    function modeAction(mode) {
        if (!tableInfo.allowedMode[mode]) {
            tableInfo.allowedMode[mode] = 1;
            //update the DB
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                table.allowedMode = tableInfo.allowedMode;
            });
        }
    }
}