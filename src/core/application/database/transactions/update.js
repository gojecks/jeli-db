/**
 * 
 * @param {*} updateData 
 * @param {*} query 
 * @param {*} tableName 
 * @param {*} replace 
 * @returns self
 */
function transactionUpdate(updateData, query, tableName, replace) {
    tableName = tableName || this.rawTables[0];
    var _this = this;
    var tableInfo = this.getTableInfo(tableName);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var validator = this.validator(tableName, columns);
    var isObjectType = isobject(updateData);

    /**
     * 
     * @param {*} cData 
     */
    function structureUpdateData(cData) {
        // return setData when its an object
        if (isObjectType || replace) {
            return cData;
        } else if (isstring(cData)) {
            //convert String Data to Object
            var nString = removeSingleQuote(cData),
                splitComma = nString.split(","),
                i = splitComma.length,
                tempObj = {};
            //Loop through the split Data
            while (i--) {
                var splitEqualTo = splitComma[i].split("=");
                //set the new Object Data
                tempObj[splitEqualTo[0]] = splitEqualTo[1];
            }

            return tempObj;
        } else {
            _this.setDBError('Unable to update Table(' + tableName + '), unaccepted dataType recieved');
        }
    }

    var dataToUpdate = structureUpdateData(updateData);
    var tableData = this.getTableData(tableName);
    var u = tableData.length;
    var updated = 0;
    var rowsToUpdate = [];
    /**
     * check for onUpdate event in schema settings
     */
    function updateAndValidateData(data, idx) {
        Object.keys(columns).forEach(function(column) {
            if (columns[column].hasOwnProperty('ON_UPDATE') && isstring(columns[column].ON_UPDATE)) {
                if (!data.hasOwnProperty(column)) {
                    data[column] = getDefaultColumnValue(columns[column].ON_UPDATE);
                }
            }
        });

        /**
         * validate our data
         */
        validator(data, idx);
    }

    /**
     * validate and update column with ON_UPDATE configuration
     */
    if (!replace) {
        updateAndValidateData(dataToUpdate, 0);
    } else {
        dataToUpdate.forEach(updateAndValidateData);
    }

    /**
     * directly update the columns
     */
    function performMultipleUpdate() {
        var defaultValueGenerator = columnObjFn(columns);
        query.forEach(function(key, idx) {
            if (tableData[key]) {
                var ref = tableData[key]._ref;
                store({
                    _data: defaultValueGenerator({}, ref),
                    _ref: ref
                }, dataToUpdate[idx], key);
            }
        });
    }

    function performSingleUpdate() {
        if (query) {
            _queryPerformer(tableData, query, function(data, idx) {
                store(data, dataToUpdate, idx);
            });
        } else {
            while (u--) {
                store(tableData[u], dataToUpdate, u);
            }
        }
    }


    /**
     * 
     * @param {*} data 
     * @param {*} idx 
     */
    function store(previous, current, idx) {
        //set the current Value
        tableData[idx]._data = extend(true, previous._data, current);
        updated++;
        /**
         * store the ref to be updated
         */
        rowsToUpdate.push({
            _ref: previous._ref,
            _data: (replace ? tableData[idx]._data : current)
        });
    }

    this.executeState.push(["update", function(disableOfflineCache) {
        //Execute Function 
        //Kill Process if error was Found
        if (_this.hasError() || !dataToUpdate) {
            throw Error(_this.getError());
        }

        if (replace) {
            performMultipleUpdate();
        } else {
            performSingleUpdate();
        }

        //push records to our resolver
        if (!disableOfflineCache) {
            _this.updateOfflineCache('update', _this.getAllRef(rowsToUpdate), tableName);
        }

        /**
         * broadcast our event
         */
        privateApi.storageFacade.broadcast(tableInfo.DB_NAME, DB_EVENT_NAMES.TRANSACTION_UPDATE, [tableName, rowsToUpdate.slice()]);

        //empty the rows 
        rowsToUpdate.length = 0;

        //return success
        return ({
            state: "update",
            table: tableName,
            result: {
                timing: performance.now() - time,
                message: updated + " row(s) updated."
            }
        });
    }]);


    return this;
};