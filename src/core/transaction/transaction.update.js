/**
 * 
 * @method Update
 * @param {*} updateData 
 * @param {*} query
 * @return {OBJECT}
 */
function transactionUpdate(updateData, query) {
    var $self = this,
        columns = this.tableInfo.columns[0];
    //convert our query
    //Function structureUpdateData()
    function structureUpdateData(setData) {
        // return setData when its an object
        if ($isObject(setData)) {
            return setData;
        } else if ($isString(setData)) {
            //convert String Data to Object
            var nString = removeSingleQuote(setData),
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
            $self.setDBError('Unable to update Table, unaccepted dataType recieved');
        }
    }


    var setData = structureUpdateData(updateData),
        u = this.tableInfo.data.length,
        updated = 0,
        rowsToUpdate = [];


    /**
     * check for onUpdate event in schema settings
     */
    Object.keys(columns).forEach(function(column) {
        if (columns[column].hasOwnProperty('ON_UPDATE')) {
            if (!setData.hasOwnProperty(column)) {
                var col = {};
                col[column] = columns[column];
                var stamp = columnObjFn(col);
                setData[column] = stamp[column];
            }
        }
    });
    /**
     * 
     * @param {*} data 
     * @param {*} idx 
     */
    function store(data, idx) {
        //set the current Value
        $self.tableInfo.data[idx]._data = extend(true, $self.tableInfo.data[idx]._data, setData);
        updated++;
        rowsToUpdate.push($self.tableInfo.data[idx]);
    }

    this.executeState.push(["update", function(disableOfflineCache) {
        //Execute Function 
        //Kill Process if error was Found
        if ($self.hasError() || !setData) {
            throw Error($self.getError());
        }

        if (query) {
            new $query($self.tableInfo.data)._(query, store);
        } else {
            while (u--) {
                store(null, u);
            }
        }

        //push records to our resolver
        if (!disableOfflineCache) {
            $self.updateOfflineCache('update', $self.getAllRef(rowsToUpdate));
        }

        /**
            broadcast event
        **/
        privateApi
            .storageEventHandler
            .broadcast(eventNamingIndex($self.tableInfo.DB_NAME, 'update'), [$self.tableInfo.TBL_NAME,
                rowsToUpdate.map(function(item) {
                    return {
                        _ref: item._ref,
                        _data: setData
                    }
                })
            ]);

        //empty the rows 
        rowsToUpdate.length = 0;

        //return success
        return { message: updated + " row(s) updated." };
    }]);

    return this;
};