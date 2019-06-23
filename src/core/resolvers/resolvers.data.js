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
            _newSyncData = {};

        /**
         * user specifies the type and ref to resolve
         * type : @types
         * ref : @ref DATA || COLUMN
         */
        if (type) {
            _newSyncData[type] = ($isEqual(type, "delete") ? {} : []);
        } else {
            _newSyncData.data = {
                'delete': {},
                update: [],
                insert: []
            }
        }

        Object.keys(_newSyncData.data).map(function(cType) {
            Object.keys(recordsToSync.data[cType]).map(function(ref) {
                if ($isEqual(cType, "delete")) {
                    _newSyncData.data[cType][ref] = true;
                } else {
                    var data = privateApi.$getDataByRef(privateApi.$getTableOptions(name, tbl, 'data') || [], ref);
                    if (data) {
                        _newSyncData.data[cType].push(data);
                    }
                }
            });
        });

        recordsToSync = null;

        return _newSyncData;
    }

    var _records = {};

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

                        setStorageItem(privateApi.storeMapping.pendingSync, _records, name);
                    }

                },
                columns: function(type, data) {
                    if (data.length) {
                        //push the data to the list
                        _records[tbl].columns[type].push.apply(_records[tbl].columns[type], data);

                        setStorageItem(privateApi.storeMapping.pendingSync, _records, name);
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
                lStorage = getStorageItem(privateApi.storeMapping.pendingSync, name);
                if (lStorage) {
                    //delete from localStorage
                    delete lStorage[tbl];
                    setStorageItem(privateApi.storeMapping.pendingSync, lStorage, name);
                }
            }

            return ({
                updateTableHash: updateTableHash
            });

            //Update Hash
            function updateTableHash(checksum) {
                if (checksum) {
                    privateApi.$taskPerformer
                        .updateDB(name, tbl, function(table) {
                            table._previousHash = table._hash;
                            table._hash = checksum;
                        });
                }
            }
        },
        $destroy: function() {
            if ($isEmptyObject(_records)) {
                _records = {};
                delStorageItem(privateApi.storeMapping.pendingSync);
            }
        },
        rename: function(newName) {
            setStorageItem(privateApi.getDataResolverName(newName), _records, name);
            delStorageItem(privateApi.storeMapping.pendingSync);
        }
    });

    if (name) {
        var lStorage = getStorageItem(privateApi.storeMapping.pendingSync, name);
        if (lStorage) {
            _records = lStorage;
        }
    }

    return _fn;
}