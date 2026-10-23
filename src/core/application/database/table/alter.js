/**
 * 
 * @param {*} tableInfo 
 */
class TableAlterInstance {
    constructor(tableInfo) {
        this.add = new TableAlterAddInstance(tableInfo);
        this.tableInfo = tableInfo;
    }

    /**
     * 
     * @param {*} columnName 
     * @returns 
     */
    drop(columnName) {
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
        TableAlterAddInstance.constructTable(row => {
            if (row.hasOwnProperty(columnName)) {
                delete row[columnName];
            }
        }, this.tableInfo);

        //update the DB
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, (table) => {
            table.schemaModified = +new Date;
            table.columns = this.tableInfo.columns
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
    rename(oldName, newName) {
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
        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, (table) => {
            table.schemaModified = +new Date;
            table.columns = this.tableInfo.columns
        });

        //reconstruct the table data
        TableAlterAddInstance.constructTable(row => {
            if (row.hasOwnProperty(oldName)) {
                row[newName] = row[oldName];
                delete row[oldName];
            }
        }, this.tableInfo);

        /**
         * broadcast event
         **/
        privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.ALTER_TABLE, [this.tableInfo.TBL_NAME, [oldName, newName], 0]);
    };
}


class TableAlterAddInstance {
    /**
     * 
     * @param {*} cFn 
     * @param {*} tableInfo 
     */
    static constructTable(cFn, tableInfo) {
        const defaultValueGenerator = tableModelMapper(tableInfo);
        const tableData = privateApi.getTableData(tableInfo.DB_NAME, tableInfo.TBL_NAME);
        tableData.forEach(function (item, idx) {
            //perform task if argument is a function
            if (isfunction(cFn)) {
                cFn(item._data || item);
            }

            // Update the dataSet
            // suport for new record type and backward compactibility for old
            const newRecord = defaultValueGenerator((item._data || item), (item._ref || item._id));
            tableData[idx] = newRecord;
            defaultValueGenerator.cleanup();
        });
    }

    constructor(tableInfo) {
        this.tableInfo = tableInfo
    }

    /**
     * 
     * @param {*} columnName 
     * @param {*} config 
     */
    column(columnName, config) {
        var isObjectColumnName = isobject(columnName);
        if (columnName && (isObjectColumnName || isstring(columnName))) {
            var nColumn = columnName;
            var notExists = !(this.tableInfo.columns[0] || {}).hasOwnProperty(columnName);

            if (!isObjectColumnName) {
                nColumn = {};
                nColumn[columnName] = isobject(config) ? config : {
                    type: 'any'
                };
            }

            //reconstruct the table
            this.tableInfo.columns[0] = Object.assign(this.tableInfo.columns[0] || {}, nColumn);
            /**
             * broadcast event to subscribers
             * only When column is new
             */
            if (!isObjectColumnName && notExists) {
                TableAlterAddInstance.constructTable(null, this.tableInfo);
                privateApi.storageFacade.broadcast(this.tableInfo.DB_NAME, DB_EVENT_NAMES.ALTER_TABLE, [this.tableInfo.TBL_NAME, columnName, 1]);
            }

            /**
             * update our database schema
             */
            privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, (table) => {
                table.schemaModified = +new Date;
                table.columns = this.tableInfo.columns;
            });
        }

        return this;
    }

    /**
 * 
 * @param {*} name 
 * @param {*} setting 
 */
    index(name, setting) {
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

        privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function (table) {
            table.schemaModified = +new Date;
            table.index = indexData;
        });
    };

    /**
     * 
     * @param {*} mode 
     */
    mode(mode) {
        if (!this.tableInfo.allowedMode[mode]) {
            this.tableInfo.allowedMode[mode] = 1;
            //update the DB
            privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, (table) => {
                table.schemaModified = +new Date;
                table.allowedMode = _this.tableInfo.allowedMode;
            });
        }
    };

    /**
     * 
     * @param {*} key 
     */
    primary(key) {
        if (key && this.tableInfo.columns[0][key]) {
            //update the DB
            privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, (table) => {
                table.schemaModified = +new Date;
                this.tableInfo.columns[0][key].PRIMARY_KEY = true;
                table.primaryKey = key;
                table.columns = this.tableInfo.columns;
            });
        }

        return this;
    };

    /**
     * 
     * @param {*} key 
     * @param {*} tableName 
     */
    foreign(key, tableName) {
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
            privateApi.updateDB(this.tableInfo.DB_NAME, this.tableInfo.TBL_NAME, function (table) {
                table.schemaModified = +new Date;
                table.foreignKey = foreignKeys;
            });
        }

        return this
    }
}