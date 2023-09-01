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
        var delRecordManager = DatabaseSyncConnector.$privateApi.storageFacade.get(DatabaseSyncConnector.$privateApi.storeMapping.delRecordName, appName);
        var resData = res.renamed || res.removed;
        var totalTask = Object.keys(deleteRecords[task]);
        var inc = 0;
        var isDataBaseTask = ('database'  == task) && resData[appName];
        // check if records are fully processed
        for (var i = 0; i < totalTask.length; i++) {
            var taskName = totalTask[i];
            if (resData.hasOwnProperty(taskName)) {
                if (('object' !== typeof resData[taskName]) && resData[taskName]) {
                    delete delRecordManager[appName][task][taskName];
                    inc++;
                } else {
                    syncHelper.setMessage(resData[taskName].message);
                }
            } else {
                syncHelper.setMessage('Unable to remove ' + task + "(" + taskName + ') from the server');
            }
        }

        /**
         * check is request type was database
         */
        if (isDataBaseTask && (inc == totalTask.length)) {
            delete delRecordManager[appName];
        }

        //update the storage
        DatabaseSyncConnector.$privateApi.storageFacade.set(DatabaseSyncConnector.$privateApi.storeMapping.delRecordName, delRecordManager, appName);
        /**
         * reset deletedRecords
         */
        if (inc == totalTask.length) {
            if (isDataBaseTask) {
                DatabaseSyncConnector.$privateApi.closeDB(appName, true);
            } else {
                DatabaseSyncConnector.$privateApi
                    .getActiveDB(appName)
                    .get(DatabaseSyncConnector.$privateApi.constants.RESOLVERS)
                    .deleteManager()
                    .reset();
            }
        }

        delRecordManager = resData = null;
    }

    /**
     * 
     * @param {*} taskName 
     */
    function done(taskName) {
        return function (res) {
            /**
             * cleanup
             */
            if (res) {
                cleanUp(taskName, res);
            }


            if (taskName != 'database') {
                startSyncState(appName, serverResource, true);
            } else {
                syncHelper.finalizeProcess(appName);
            }
        }
    };

    function fail(res) {
        if (res.data && res.data.removed) {
            for(var tblName in res.data.removed) {
                syncHelper.setMessage(res.data.removed[tblName].message || "Unable to perform requested action.");
            }
        }
        syncHelper.setMessage('Failed to synchronize, please try again');
        syncHelper.killState(appName);
    }


    /**
     * Main sync Process
     */
    function mainProcess() {
        var api = '/database/table/drop';
        var data = deleteRecords.table;
        var message = 'Droping ' + JSON.stringify(Object.keys(data)) + ' Tables from the server';
        var taskName = "table";
        //check if database was remove from client
        if (deleteRecords.database[appName]) {
            api = '/database/drop';
            data = deleteRecords.database;
            message = "Droping " + appName + " Application from the server";
            taskName = "database";
        }


        /**
         * Process renamed Tables before deleting
         */
        var _renamedTables = Object.keys(deleteRecords.rename);
        if ((taskName == 'table') && _renamedTables.length) {
            syncHelper.setMessage('Renaming Tables(' + JSON.stringify(_renamedTables) + ') on the server');
            request("/database/table/rename", 'renamed', deleteRecords.rename)
                .then(res => {
                    cleanUp('rename', res);
                    mainRequest()
                }, fail);
            return;
        }

        /**
         * 
         * @param {*} path 
         * @param {*} ref 
         * @param {*} data 
         */
        function request(path, ref, data) {
            var request = syncHelper.setRequestData(appName, path, true, null);
            request.data = { [ref]: data };
            return DatabaseSyncConnector.$privateApi.$http(request);
        }

        function mainRequest() {
            if (!Object.keys(data).length) {
                done(taskName)();
                return;
            }
            //set message to our console
            syncHelper.setMessage(message);
            request(api, 'remove', data).then(done(taskName), fail);
        }

        mainRequest();
    }
    /**
     * get the Application API
     */
    mainProcess();
}