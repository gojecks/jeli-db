/**
 * 
 * @param {*} appName 
 * @param {*} deleteRecords 
 * @param {*} serverResource 
 */
function deleteSyncState(appName, deleteRecords, serverResource) {
    /**
     * 
     * @param {*} task 
     * @param {*} res 
     */
    function cleanUp(task, res) {
        var _delRecordManager = privateApi.storageFacade.get(privateApi.storeMapping.delRecordName, appName);
        var _resData = res.renamed || res.removed;
        var _totalTask = Object.keys(deleteRecords[task]);
        var _inc = 0;
        var _isDataBaseTask = isequal('database', task) && _resData[appName];
        // check if records are fully processed
        for (var i = 0; i < _totalTask.length; i++) {
            var taskName = _totalTask[i];
            if (_resData.hasOwnProperty(taskName)) {
                if (!isobject(_resData[taskName]) && _resData[taskName]) {
                    delete _delRecordManager[appName][task][taskName];
                    _inc++;
                } else {
                    syncHelper.setMessage(_resData[taskName].message);
                }
            } else {
                syncHelper.setMessage('Unable to remove ' + task + "(" + taskName + ') from the server');
            }
        }

        /**
         * check is request type was database
         */
        if (_isDataBaseTask && isequal(_inc, _totalTask.length)) {
            delete _delRecordManager[appName];
        }

        //update the storage
        privateApi.storageFacade.set(privateApi.storeMapping.delRecordName, _delRecordManager, appName);
        /**
         * reset deletedRecords
         */
        if (isequal(_inc, _totalTask.length)) {
            if (_isDataBaseTask) {
                privateApi.closeDB(appName, true);
            } else {
                privateApi
                    .getActiveDB(appName)
                    .get(constants.RESOLVERS)
                    .deleteManager()
                    .reset();
            }
        }

        _delRecordManager = _resData = null;
    }

    /**
     * 
     * @param {*} _task 
     */
    function done(_task) {
        return function(res) {
            /**
             * cleanup
             */
            if (res) {
                cleanUp(_task, res);
            }


            if (!isequal(_task, 'database')) {
                startSyncState(appName, serverResource, true);
            } else {
                syncHelper.finalizeProcess(appName);
            }
        }
    };

    function fail(res) {
        if (res.data && res.data.removed) {
            expect(res.data.removed).each(function(obj) {
                syncHelper.setMessage(obj.message || "Unable to perform requested action.");
            });
        }
        syncHelper.setMessage('Failed to synchronize, please try again');
        syncHelper.killState(appName);
    };


    /**
     * Main sync Process
     */
    function mainProcess() {
        var api = '/database/table/drop';
        var data = deleteRecords.table;
        var message = 'Droping ' + JSON.stringify(Object.keys(data)) + ' Tables from the server';
        var _task = "table";
        //check if database was remove from client
        if (deleteRecords.database[appName]) {
            api = '/database/drop';
            data = deleteRecords.database;
            message = "Droping " + appName + " Application from the server";
            _task = "database";
        }


        /**
         * Process renamed Tables before deleting
         */
        var _renamedTables = Object.keys(deleteRecords.rename);
        if (isequal(_task, 'table') && _renamedTables.length) {
            syncHelper.setMessage('Renaming Tables(' + JSON.stringify(_renamedTables) + ') on the server');
            processRenamedTables().then(mainRequest, fail);
            return;
        }


        function processRenamedTables() {
            return request("/database/table/rename", 'renamed', deleteRecords.rename)
                .then(function(res) {
                    cleanUp('rename', res);
                });
        }

        /**
         * 
         * @param {*} _api 
         * @param {*} ref 
         * @param {*} data 
         */
        function request(_api, ref, data) {
            var _options = syncHelper.setRequestData(appName, _api, true, null);
            _options.data[ref] = data;
            return privateApi.$http(_options);
        }

        function mainRequest() {
            if (!Object.keys(data).length) {
                done(_task)();
                return;
            }
            //set message to our console
            syncHelper.setMessage(message);
            request(api, 'remove', data).then(done(_task), fail);
        }

        mainRequest();
    }
    /**
     * get the Application API
     */
    syncHelper
        .process
        .getApplicationApiKey(appName)
        .then(mainProcess, function() {
            syncHelper.setMessage('Failed to retrieve Application Key');
            fail();
        });
}