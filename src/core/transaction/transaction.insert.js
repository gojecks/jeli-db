/**
 * 
 * @param {*} data 
 * @param {*} hardInsert 
 */
function transactionInsert(data, hardInsert) {
    var processedData = [],
        _skipped = [],
        $self = this,
        tableInfo = $self.tableInfo,
        columns = tableInfo.columns[0],
        columnObj = columnObjFn(columns),
        _typeValidator = privateApi.$getActiveDB(tableInfo.DB_NAME).$get('dataTypes'),
        objectType = $isObject(data);
    /**
     * Data must an Array or Object format
     * throw error if not in the format
     */
    if (!$isArray(data) && !objectType) {
        this.setDBError("Invalid dataType, accepted types are  (ARRAY or OBJECT)");
    }

    /**
     * pardon object property
     */
    if (objectType) {
        console.warn('[INSERT]: Support for Object data will be removed in later version');
        data = [data];
    }

    function checkAndSetPrimaryKeys(pdata) {
        tableInfo.lastInsertId++;
        //update the data to store
        Object.keys(pdata).forEach(function(key) {
            //check auto_increment
            if (!pdata[key] && columns[key].hasOwnProperty('AUTO_INCREMENT') && $inArray(columns[key].type.toUpperCase(), ['INT', 'NUMBER', 'INTEGER'])) {
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
            data.forEach(function(item, idx) {
                var cdata = {};
                //switch type
                if ($isObject(item)) {
                    cdata = item;
                } else {
                    cdata = copyDataByIndex(Object.keys(columnObj), item);
                }

                if (processData(cdata, idx)) {
                    var pData = extend(true, columnObj, cdata);
                    // check indexing
                    var _ref = GUID(),
                        _dataExists = checkTableIndex(pData, _ref);
                    //push data to processData array
                    //set obj ref GUID
                    if (!_dataExists) {
                        checkAndSetPrimaryKeys(pData);
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
                checkAndSetPrimaryKeys(item);
                return ({
                    _ref: ref,
                    _data: item
                });
            });

            setLastInsertID();
        }
    }


    if (!$isEqual(this.processState, "insert")) {
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
                $self.updateOfflineCache('insert', $self.getAllRef(processedData));
            }

            //push records to our resolver
            return updateTable(processedData.length);
        }]);
    }

    this.processState = "insert";

    /**
     * 
     * @param {*} cData 
     * @param {*} dataRef 
     */
    function processData(cData, dataRef) {
        //Process the Data
        var passed = 1;
        if (cData) {
            expect(cData).each(function(val, idx) {
                //check if column is in table
                if (!columns[idx]) {
                    //throw new error
                    $self.setDBError('column (' + idx + ') was not found on this table (' + tableInfo.TBL_NAME + '), to add a new column use the addColumn FN - ref #' + dataRef);
                    passed = !1;
                    return;
                }

                var type = typeof cData[idx],
                    requiredType = (columns[idx].type || 'string').toUpperCase();
                if (!_typeValidator.validate(cData[idx], requiredType)) {
                    $self.setDBError(idx + " Field requires " + requiredType + ", but got " + type + "- ref #" + dataRef);
                    passed = !1;
                }
            });

            return passed;
        }

        return !1;
    }

    //Update the table content
    function updateTable(totalRecords) {
        if ($isArray(processedData) && totalRecords) {
            tableInfo.data.push.apply(tableInfo.data, processedData);
            /**
                broadcast event
            **/
            privateApi.storageEventHandler.broadcast(eventNamingIndex(tableInfo.DB_NAME, 'insert'), [tableInfo.TBL_NAME, processedData, false]);
        }

        //return success after push
        processedData = [];
        columns = _typeValidator = null;
        return ({
            message: totalRecords + " record(s) inserted successfully, skipped " + _skipped.length + " existing record(s)",
            skippedRecords: _skipped.slice(0)
        });
    }

    return this;
};