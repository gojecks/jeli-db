/**
 * 
 * @param {*} data 
 * @param {*} updateRef 
 */
function TransactionInsertReplace(data, updateRef) {
    if (!$isArray(data)) {
        throw new Error('TypeError: Expected Array dataType but got ' + typeof data);
    }
    var tableName = this.rawTables[0];
    var tableInfo = this.getTableInfo(tableName);
    var columns = tableInfo.columns[0];
    var rowsToUpdate = [];
    var updateIndexes = [];
    var rowsToInsert = [];
    var _this = this;
    var updateRefMapper = [];

    updateRef = (updateRef || Object.keys(columns).filter(function(key) {
        return columns[key].PRIMARY_KEY;
    })[0]);

    /**
     * generate Mapping ref to be used for update mapping
     */
    if (updateRef) {
        updateRefMapper = this.getColumnValues(tableName, updateRef);
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

    this.insert(rowsToInsert, false, tableName);
    this.update(rowsToUpdate, updateIndexes, tableName, true);

    return {
        execute: function(disableOfflineCache) {
            return new DBPromise(function(resolve, reject) {
                var response = {
                    state: "insertOrReplace",
                    table: tableName
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

                        resolve(response);
                    })
                    .onError(function(err) {
                        cleanUp();
                        response.transactions = err;
                        response.message = "Error running transactions";
                        reject(response);
                    });
            })
        }
    };
}