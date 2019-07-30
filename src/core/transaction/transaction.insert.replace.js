/**
 * 
 * @param {*} data 
 * @param {*} updateRef 
 */
function TransactionInsertReplace(data, updateRef) {
    if (!$isArray(data)) {
        throw new Error('TypeError: Expected Array dataType but got ' + typeof data);
    }

    var tableInfo = this.getTableInfo(),
        columns = tableInfo.columns[0],
        rowsToUpdate = [],
        updateIndexes = [],
        rowsToInsert = [],
        _this = this,
        updateRefMapper = [];

    updateRef = (updateRef || Object.keys(columns).filter(function(key) {
        return columns[key].hasOwnProperty('PRIMARY_KEY');
    })[0]);

    /**
     * generate Mapping ref to be used for update mapping
     */
    if (updateRef) {
        updateRefMapper = this.getColumnValues(tableInfo.data, updateRef);
    }

    /**
     * 
     * @param {*} item 
     * @param {*} idx 
     */
    function dataIterator(item, idx) {
        var updateValue = item[updateRef],
            valueIndex = updateRefMapper.indexOf(updateValue);
        if (item.hasOwnProperty(updateRef) && !$isEqual(-1, valueIndex)) {
            updateIndexes.push(valueIndex);
            rowsToUpdate.push(item);
        } else {
            rowsToInsert.push(item);
        }
    }

    function cleanUp() {
        //clear processed Data
        tableInfo = columns = null;
        updateIndexes.length = 0;
        rowsToInsert.length = 0;
        updateRefMapper.length = 0;
        rowsToUpdate.length = 0;

    }

    /**
     * iterate through data to collect all errors found in data
     */
    data.forEach(dataIterator);

    this.insert(rowsToInsert, false, tableInfo.TBL_NAME);
    this.update(rowsToUpdate, updateIndexes, tableInfo.TBL_NAME, true);

    return {
        execute: function(disableOfflineCache) {
            var defer = new _Promise(),
                response = {
                    state: "insertOrReplace",
                    table: tableInfo.TBL_NAME
                };
            _this.execute(disableOfflineCache)
                .onSuccess(function(res) {
                    cleanUp();
                    response.transactions = res;
                    response.result = {
                        message: res.map(function(item) {
                            return (item.result || item).message
                        }).join("\n")
                    };

                    defer.resolve(response);
                })
                .onError(function(err) {
                    cleanUp();
                    response.transactions = err;
                    response.message = "Error running transactions";
                    defer.reject(response);
                });

            return new DBPromise(defer);
        }
    };
}