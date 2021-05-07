/**
 * 
 * @param {*} updateData 
 * @param {*} query 
 * @param {*} tableName 
 * @param {*} replace 
 * @returns self
 */
function transactionUpdate(updateData, query, tableName, replace) {
    var $self = this,
        tableInfo = this.getTableInfo(tableName),
        time = performance.now(),
        columns = tableInfo.columns[0],
        validator = this.validator(tableInfo.TBL_NAME, columns),
        isObjectType = $isObject(updateData);

    /**
     * 
     * @param {*} cData 
     */
    function structureUpdateData(cData) {
        // return setData when its an object
        if (isObjectType || replace) {
            return cData;
        } else if ($isString(cData)) {
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
            $self.setDBError('Unable to update Table(' + tableInfo.TBL_NAME + '), unaccepted dataType recieved');
        }
    }

    var dataToUpdate = structureUpdateData(updateData),
        u = tableInfo.data.length,
        updated = 0,
        rowsToUpdate = [];


    /**
     * check for onUpdate event in schema settings
     */
    function updateAndValidateData(data, idx) {
        Object.keys(columns).forEach(function(column) {
            if (columns[column].hasOwnProperty('ON_UPDATE') && $isString(columns[column].ON_UPDATE)) {
                if (!data.hasOwnProperty(column)) {
                    var col = {};
                    col[column] = columns[column];
                    var stamp = columnObjFn(col);
                    data[column] = stamp[column];
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
        var fields = columnObjFn(columns);
        query.forEach(function(key, idx) {
            if (tableInfo.data[key]) {
                store({
                    _data: fields,
                    _ref: tableInfo.data[key]._ref
                }, dataToUpdate[idx], key);
            }
        });
    }

    function performSingleUpdate() {
        if (query) {
            new $query(tableInfo.data)._(query, function(data, idx) {
                store(data, dataToUpdate, idx);
            });
        } else {
            while (u--) {
                store(tableInfo.data[u], dataToUpdate, u);
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
        tableInfo.data[idx]._data = extend(true, previous._data, current);
        updated++;
        /**
         * store the ref to be updated
         */
        rowsToUpdate.push({
            _ref: previous._ref,
            _data: (replace ? tableInfo.data[idx]._data : current)
        });
    }

    this.executeState.push(["update", function(disableOfflineCache) {
        //Execute Function 
        //Kill Process if error was Found
        if ($self.hasError() || !dataToUpdate) {
            throw Error($self.getError());
        }

        if (replace) {
            performMultipleUpdate();
        } else {
            performSingleUpdate();
        }

        //push records to our resolver
        if (!disableOfflineCache) {
            $self.updateOfflineCache('update', $self.getAllRef(rowsToUpdate), tableInfo.TBL_NAME);
        }

        /**
         * broadcast our event
         */
        privateApi
            .storageEventHandler
            .broadcast(eventNamingIndex(tableInfo.DB_NAME, 'update'), [tableInfo.TBL_NAME, rowsToUpdate.slice()]);

        //empty the rows 
        rowsToUpdate.length = 0;

        //return success
        return ({
            state: "update",
            table: tableInfo.TBL_NAME,
            result: {
                timing: performance.now() - time,
                message: updated + " row(s) updated."
            }
        });
    }]);


    return this;
};