/**
 * 
 * @param {*} tableInfo 
 */
function TableAlterInstance(tableInfo) {
    this.drop = function(columnName) {
        /**
         * check if columnName already exists
         */
        if (!tableInfo.columns[0].hasOwnProperty(columnName)) {
            return 0;
        }

        if ($isString(columnName) && tableInfo.columns[0][columnName]) {
            delete tableInfo.columns[0][columnName];
        }

        //reconstruct the table
        TableAlterAddInstance.constructTable(function(row) {
            if (row._data.hasOwnProperty(columnName)) {
                delete row._data[columnName];
            }
        }, tableInfo);

        //update the DB
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.columns = tableInfo.columns
        });

        /**
         * broadcast event
         **/
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onAlterTable'), [tableInfo.TBL_NAME, columnName, 0]);
    };

    this.rename = function(oldName, newName) {
        /**
         * check if columnName already exists
         */
        if (!tableInfo.columns[0].hasOwnProperty(oldName)) {
            console.log('[JDB TABLE ALTER]: Column(' + oldName + ') doesn\'t exists');
            return 0;
        }

        if (tableInfo.columns[0].hasOwnProperty(newName)) {
            console.log('[JDB TABLE ALTER]: Column(' + newName + ') already exists');
            return 0;
        }

        if ($isEqual(newName.toLowerCase(), oldName.toLowerCase())) {
            console.log('[JDB TABLE ALTER]: Duplicate columnName (' + newName + ')');
            return 0;
        }

        // start process
        tableInfo.columns[0][newName] = tableInfo.columns[0][oldName];
        // remve the existing data
        delete tableInfo.columns[0][oldName];

        //update the DB
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.columns = tableInfo.columns
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
        privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onAlterTable'), [tableInfo.TBL_NAME, [oldName, newName], 0]);
    }

    this.add = new TableAlterAddInstance(tableInfo);
}

TableAlterAddInstance.constructTable =
    /**
     * 
     * @param {*} cFn 
     * @param {*} tableInfo 
     */
    function(cFn, tableInfo) {
        var columns = columnObjFn(tableInfo.columns[0]);
        tableInfo.data.forEach(function(item, idx) {
            //perform task if argument is a function
            if ($isFunction(cFn)) {
                cFn(item);
            }
            //Update the dataSet
            tableInfo.data[idx]._data = extend(true, columns, item._data);
        });
    };

function TableAlterAddInstance(tableInfo) {
    /**
     * 
     * @param {*} key 
     */
    this.primary = function(key) {
        if (key && tableInfo.columns[0][key]) {
            //update the DB
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                tableInfo.columns[0][key].PRIMARY_KEY = true;
                table.primaryKey = key;
                table.columns = tableInfo.columns;
            });
        }

        return this;
    };

    /**
     * 
     * @param {*} key 
     * @param {*} tableName 
     */
    this.foreign = function(key, tableName) {
        if (key && tableName && tableInfo.columns[0][key]) {
            if (privateApi.getActiveDB(tableInfo.DB_NAME).get('$tableExist')(tableName)) {
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
    this.column = function(columnName, config) {
        if (columnName && ($isObject(columnName) || $isString(columnName))) {
            var nColumn = columnName,
                columnExists = (tableInfo.columns[0] || {}).hasOwnProperty(columnName);

            if ($isString(nColumn)) {
                nColumn = {};
                nColumn[columnName] = config ? config : {
                    type: 'any'
                };
            }

            //reconstruct the table
            tableInfo.columns[0] = extend(true, tableInfo.columns[0] || {}, nColumn);
            /**
             * broadcast event to subscribers
             * only When column is new
             */
            if (!columnExists) {
                TableAlterAddInstance.constructTable(null, tableInfo);
                privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'onAlterTable'), [tableInfo.TBL_NAME, columnName, 1]);
            }

            /**
             * update our database schema
             */
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                table.columns = tableInfo.columns;
            });
        }

        return this;
    }

    /**
     * 
     * @param {*} name 
     * @param {*} setting 
     */
    this.index = function(name, setting) {
        tableInfo.index[name] = setting || { unique: false };
        jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
            table.index = tableInfo.index;
        });
    };

    /**
     * 
     * @param {*} mode 
     */
    this.mode = function(mode) {
        if (!tableInfo.allowedMode[mode]) {
            tableInfo.allowedMode[mode] = 1;
            //update the DB
            jdbUpdateStorage(tableInfo.DB_NAME, tableInfo.TBL_NAME, function(table) {
                table.allowedMode = tableInfo.allowedMode;
            });
        }
    };
}