//@Function Name DBRecordResolvers()
//@return OBJECTS

/**
 * 
 * @param {*} name 
 */
function DBRecordResolvers(name) {
    function tableRecordHolder() {
        return ({
            delete: {},
            update: {},
            insert: {}
        });
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} type 
     * @param {*} cref 
     */
    function resolveSyncData(tbl, type, cref) {
        var recordsToSync = jEliDeepCopy(_records[tbl]),
            canSync = false;
        Object.keys(recordsToSync.data).map(function(cType) {
            Object.keys(recordsToSync.data[cType]).map(function(ref) {
                if ($isEqual(cType, "delete")) {
                    recordsToSync.data[cType][ref] = true;
                } else {
                    recordsToSync.data[cType][ref] = $queryDB.$getDataByRef($queryDB.$getTableOptions(name, tbl, 'data') || [], ref);
                }
            });
        });

        /**
         * user specifies the type and ref to resolve
         * type : @types
         * ref : @ref DATA || COLUMN
         */
        if (cref) {
            var newRet = {};
            newRet[cref] = {};
            if (type) {
                newRet[cref][type] = recordsToSync[cref][type];
                return newRet;
            }
            newRet[cref] = recordsToSync[cref];
            return newRet;
        }

        return recordsToSync;
    }

    var _records = {},
        _lRecordName = $queryDB.getDataResolverName(name);

    var _fn = ({
        $set: function(tbl) {
            if (!_records[tbl]) {
                //set the record
                _records[tbl] = { data: tableRecordHolder(), columns: tableRecordHolder() };
            }


            return ({
                data: function(type, data) {
                    if (data.length) {
                        //push the data to the list
                        data.forEach(function(ref) {
                            switch (type) {
                                case ('update'):
                                    delete _records[tbl].data['insert'][ref];
                                    break;
                                case ('delete'):
                                    delete _records[tbl].data['insert'][ref];
                                    delete _records[tbl].data['update'][ref];
                                    break;
                            }

                            _records[tbl].data[type][ref] = true;
                        });

                        setStorageItem(_lRecordName, _records);
                    }
                },
                columns: function(type, data) {
                    if (data.length) {
                        //push the data to the list
                        _records[tbl].columns[type].push.apply(_records[tbl].columns[type], data);

                        setStorageItem(_lRecordName, _records);
                    }
                }
            });
        },
        $get: function(tbl, type, ref) {
            if (_records[tbl]) {
                return resolveSyncData.apply(resolveSyncData, arguments);
            }

            return { data: tableRecordHolder(), columns: tableRecordHolder() };
        },
        $isResolved: function(tbl) {
            var lStorage;
            if (_records[tbl]) {
                delete _records[tbl];
                lStorage = getStorageItem(_lRecordName);
                if (lStorage) {
                    //delete from localStorage
                    delete lStorage[tbl];
                    setStorageItem(_lRecordName, lStorage);
                }
            }

            return ({
                updateTableHash: updateTableHash
            });

            //Update Hash
            function updateTableHash($hash) {
                $queryDB.$taskPerformer
                    .updateDB(name, tbl, function(table) {
                        table.$hash = $hash;
                    });
            }
        },
        $destroy: function() {
            if ($isEmptyObject(_records)) {
                _records = {};
                setStorageItem(_lRecordName, {});
            }
        },
        rename: function(newName) {
            setStorageItem($queryDB.getDataResolverName(newName), _records);
            delStorageItem(_lRecordName);
        }
    });

    if (name) {
        var lStorage = getStorageItem(_lRecordName);
        if (lStorage) {
            _records = lStorage;
        }
    }

    return _fn;
}