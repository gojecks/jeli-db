/**
 * 
 * @param {*} data 
 * @param {*} hardInsert 
 * @param {*} tableName  optional
 */
function transactionInsert(data, hardInsert, tableName) {
    var processedData = [],
        _skipped = [],
        $self = this,
        tableInfo = this.getTableInfo(tableName),
        time = performance.now(),
        columns = tableInfo.columns[0],
        columnObj = columnObjFn(columns),
        objectType = $isObject(data),
        _validator = this.validator(tableInfo.TBL_NAME, columns);
    /**
     * Data must an Array or Object format
     * throw error if not in the format
     */
    if (!$isArray(data) && !objectType) {
        this.setDBError("Invalid dataType received, accepted types are  (ARRAY or OBJECT)");
    }

    /**
     * pardon object property
     */
    if (objectType) {
        console.warn('[INSERT]: Support for Object data will be removed in later version');
        data = [data];
    }

    function checkAndSetAutoIncrements(pdata) {
        tableInfo.lastInsertId++;
        //update the data to store
        Object.keys(pdata).forEach(function(key) {
            //check auto_increment
            var column = columns[key];
            if (!pdata[key] && column.hasOwnProperty('AUTO_INCREMENT') && $inArray(column.type.toUpperCase(), ['INT', 'NUMBER', 'INTEGER'])) {
                pdata[key] = tableInfo.lastInsertId;
            }
        });
    }


    /**
     * 
     * @param {*} item 
     * @param {*} keys 
     */
    function copyDataByIndex(item, keys) {
        var cdata = {};
        keys.forEach(function(key) {
            cdata[keys[key]] = item[key];
        });

        return cdata;
    }

    function setLastInsertID() {
        // set lastinsert ID
        tableInfo.lastInsertId = (tableInfo.lastInsertId + processedData.length);
        data = null;
    }

    function checkTableIndex(pData, _ref) {
        var _index,
            _dataExists = false;
        for (_index in tableInfo.index) {
            var _currentIndexCheck = tableInfo.index[_index];
            if (_currentIndexCheck.indexes) {
                // check the the index already exists
                if (_currentIndexCheck.indexes[pData[_index]]) {
                    if (_currentIndexCheck.unique) {
                        _dataExists = true;
                        _skipped.push(_currentIndexCheck.indexes[pData[_index]]);
                    }
                } else {
                    _currentIndexCheck.indexes[pData[_index]] = _ref;
                }
            } else {
                _currentIndexCheck.indexes = {};
                _currentIndexCheck.indexes[pData[_index]] = _ref;
            }
        }

        return _dataExists;
    }

    if (data.length && columnObj && !this.hasError()) {
        /**
         * check for hardInsert
         * data must contain refs
         */
        if (hardInsert) {
            /**
             * remove data not jdb structure
             */
            processedData = data.map(function(item, idx) {
                if (!item._ref) {
                    _skipped.push(idx);
                }
                return item;
            }).filter(function(item) { return (item._ref && item._data); });

            setLastInsertID();
        }
        /**
         * check if dataProcessing is disabled
         */
        else if (this.processData) {
            var columnNames = Object.keys(columnObj);
            data.forEach(function(item, idx) {
                var cdata = {};
                //switch type
                if ($isObject(item)) {
                    cdata = item;
                } else {
                    cdata = copyDataByIndex(columnNames, item);
                }

                if (_validator(cdata, idx)) {
                    var pData = extend(true, columnObj, cdata);
                    // check indexing
                    var _ref = GUID(),
                        _dataExists = checkTableIndex(pData, _ref);
                    //push data to processData array
                    //set obj ref GUID
                    if (!_dataExists) {
                        checkAndSetAutoIncrements(pData);
                        processedData.push({
                            _ref: _ref,
                            _data: pData
                        });
                    }
                }
            });
        } else {
            // generate a new mapping dataset to be store
            processedData = data.map(function(item) {
                var ref = GUID();
                checkTableIndex(item, ref);
                checkAndSetAutoIncrements(item);
                var pData = extend(true, columnObj, item);
                return ({
                    _ref: ref,
                    _data: pData
                });
            });

            setLastInsertID();
        }
    }



    /**
     * Update the table content
     * @param {*} totalRecords 
     */
    function updateTable(totalRecords) {
        var totalRecords = processedData.length;
        if ($isArray(processedData) && totalRecords) {
            tableInfo.data.push.apply(tableInfo.data, processedData);
            /**
                broadcast event
            **/
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'insert'), [tableInfo.TBL_NAME, processedData, false]);
        }

        //return success after push
        processedData = [];
        columns = null;
        return new InsertQueryEvent(
            tableInfo.TBL_NAME,
            tableInfo.lastInsertId, {
                timing: performance.now() - time,
                message: totalRecords + " record(s) inserted successfully, skipped " + _skipped.length + " existing record(s)",
                skippedRecords: _skipped.slice(0)
            });
    }

    this.executeState.push(["insert", function(disableOfflineCache) {
        //errorLog Must be empty
        if ($self.hasError()) {
            //clear processed Data
            processedData = [];
            _skipped = [];
            throw new Error($self.getError());
        }

        // update offline
        if (!disableOfflineCache) {
            $self.updateOfflineCache('insert', $self.getAllRef(processedData), tableInfo.TBL_NAME);
        }

        //push records to our resolver
        return updateTable();
    }]);



    return this;
};