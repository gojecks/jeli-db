    //queryDB taskPerformer
    function _privateTaskPerfomer(self) {
        var _publicApi = function() {
            this.updateDeletedRecord = updateDeletedRecord;
            this.set = setStorageItem;
            this.get = getStorageItem;
            this.del = delStorageItem;
        };

        /**
         * 
         * @param {*} name 
         * @param {*} tblName 
         * @param {*} updateFn 
         * @param {*} lastSynced 
         */
        _publicApi.prototype.updateDB = function(name, tblName, updateFn, lastSynced) {
            //put the data to DB
            if (name) {
                //update the table lastModified
                var table;
                if (tblName) {
                    table = self.$getTable(name, tblName);
                    if (table) {
                        table.lastModified = +new Date;
                        if (updateFn && $isFunction(updateFn)) {
                            updateFn.apply(updateFn, [table]);
                        }
                    }

                }

                //update DB key
                var dbRef = self.$getActiveDB(name).$get('resourceManager').getResource();
                if (dbRef) {
                    dbRef.lastUpdated = +new Date;
                    dbRef.lastSyncedDate = lastSynced || dbRef.lastSyncedDate;

                    if (tblName && table) {
                        if (!dbRef.resourceManager[tblName]) {
                            dbRef.resourceManager[tblName] = {
                                $hash: table.$hash,
                                lastModified: +new Date,
                                created: table.created || +new Date
                            };
                        }

                        /**
                         * set last sync date for table
                         */
                        dbRef.resourceManager[tblName].lastSyncedDate = lastSynced || dbRef.resourceManager[tblName].lastSyncedDate || null;

                    }

                    //update
                    self.$getActiveDB(name).$get('resourceManager').setResource(dbRef);
                }

                setStorageItem(name, self.$get(name), name);
                //check if storage have been cleared by user
                if (!dbRef) {
                    this.storageChecker(name);
                }
            }
        };

        /**
         * 
         * @param {*} name 
         */
        _publicApi.prototype.initializeDB = function(name) {
            //set recordResolvers
            if (!self.$getActiveDB(name).$get('resourceManager').$isExists()) {
                return false;
            } else {
                //retrieve current DB items
                var storageData = getStorageItem(name);
                //set delRecords
                if (storageData) {
                    self.$set(name, storageData);
                    // clean up data
                    storageData = null;
                    return true;
                }
            }

            return false;
        };

        /**
         * 
         * @param {*} name 
         */
        _publicApi.prototype.storageChecker = function(name) {
            self.$getActiveDB(name).$get('resourceManager').setResource(getDBSetUp(name))
        }

        return (new _publicApi);

    };