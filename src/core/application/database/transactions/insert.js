/**
 * 
 * @param {*} data 
 * @param {*} hardInsert 
 * @param {*} tableName  optional
 */
function transactionInsert(data, hardInsert, tableName) {
    /**
     * make sure table is set
     */
    tableName = tableName || this.rawTables[0];
    var processedData = [];
    var _skipped = [];
    var _this = this;
    var tableInfo = this.getTableInfo(tableName);
    var time = performance.now();
    var columns = tableInfo.columns[0];
    var objectType = $isObject(data);
    var _validator = this.validator(tableInfo.TBL_NAME, columns);
    var defaultValueGenerator = columnObjFn(columns);
    /**
     * Data must an Array or Object format
     * throw error if not in the format
     */
    if (!$isArray(data) && !objectType) {
        this.setDBError("Invalid dataType received, accepted types are  (ARRAY or OBJECT)");
    }

    /**
     * pardon object property
     * @deprecated
     */
    if (objectType) {
        console.warn('[INSERT]: Support for Object data will be removed in later version');
        data = [data];
    }


    /**
     * 
     * @param {*} item 
     * @param {*} keys 
     */
    function copyDataByIndex(keys, item) {
        return keys.reduce(function(accum, key, index) {
            accum[key] = item[index];
        }, {});
    }

    function setLastInsertID() {
        // set lastinsert ID
        tableInfo.lastInsertId = (tableInfo.lastInsertId + processedData.length);
        data = null;
    }

    /**
     * 
     * @returns function
     */
    function getAutoIncCallback() {
        var fields = defaultValueGenerator.columnKeys.reduce(function(accum, column) {
            if (columns[column].AUTO_INCREMENT && $inArray(columns[column].type.toUpperCase(), ['INT', 'NUMBER', 'INTEGER'])) {
                accum.push(column);
            }
            return accum;
        }, []);

        return function(data) {
            var inc = ++tableInfo.lastInsertId;
            if (fields.length) {
                fields.forEach(function(field) {
                    data[field] = inc;
                });
            }
        };
    }

    /**
     * 
     * @param {*} pData 
     * @param {*} _ref 
     */
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

    if (data.length && !this.hasError()) {
        var autoIncCallback = getAutoIncCallback();
        /**
         * check for hardInsert
         * data must contain refs
         */
        if (hardInsert) {
            /**
             * remove data not jdb structure
             */
            processedData = data.reduce(function(accum, item, idx) {
                if (!item._ref || !item._data) {
                    _skipped.push(idx);
                } else {
                    accum.push(item)
                }

                return accum;
            }, []);

            setLastInsertID();
        }
        /**
         * check if dataProcessing is disabled
         */
        else if (this.processData) {
            var len = data.length;
            for (var i = 0; i < len; i++) {
                var item = data[i];
                var cdata = {};
                //switch type
                if ($isObject(item)) {
                    cdata = item;
                } else {
                    cdata = copyDataByIndex(defaultValueGenerator.columnKeys, item);
                }

                if (_validator(cdata, i)) {
                    var ref = GUID();
                    var pData = defaultValueGenerator(cdata, ref);
                    // check indexing
                    var _dataExists = checkTableIndex(pData, ref);
                    //push data to processData array
                    //set obj ref GUID
                    if (!_dataExists) {
                        autoIncCallback(pData);
                        processedData.push({
                            _ref: ref,
                            _data: pData
                        });
                    }
                }
            }
        } else {
            // generate a new mapping dataset to be store
            processedData = data.map(function(item) {
                var ref = GUID();
                checkTableIndex(item, ref);
                autoIncCallback(item);
                var pData = defaultValueGenerator(item, ref);
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
            privateApi.storageFacade.broadcast(tableInfo.DB_NAME, DB_EVENT_NAMES.TRANSACTION_INSERT, [tableInfo.TBL_NAME, processedData, true]);
        }

        //return success after push
        var lastInsertId = (tableInfo.primaryKey ? processedData[0]._data[tableInfo.primaryKey] : tableInfo.lastInsertId)
        processedData = [];
        columns = null;
        return new InsertQueryEvent(
            tableInfo.TBL_NAME,
            lastInsertId, {
                timing: performance.now() - time,
                message: totalRecords + " record(s) inserted successfully, skipped " + _skipped.length + " existing record(s)",
                skippedRecords: _skipped.slice(0)
            });
    }

    this.executeState.push(["insert", function(disableOfflineCache) {
        //errorLog Must be empty
        if (_this.hasError()) {
            //clear processed Data
            processedData = [];
            _skipped = [];
            throw new Error(_this.getError());
        }

        // update offline
        if (!disableOfflineCache) {
            _this.updateOfflineCache('insert', _this.getAllRef(processedData), tableInfo.TBL_NAME);
        }

        //push records to our resolver
        return updateTable();
    }]);



    return this;
};