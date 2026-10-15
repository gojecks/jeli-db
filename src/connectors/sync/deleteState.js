
class DeleteSyncState {
     static mainProcess(appName, deleteRecords, serverResource) {
        let api = '/database/table/drop';
        let data = deleteRecords.table;
        let message = `Droping ${JSON.stringify(Object.keys(data))} Tables from the server`;
        let taskName = "table";
        //check if database was remove from client
        if (deleteRecords.database[appName]) {
            api = '/database/drop';
            data = deleteRecords.database;
            message = `Droping ${appName} Application from the server`;
            taskName = "database";
        }


        /**
         * Process renamed Tables before deleting
         */
        const _renamedTables = Object.keys(deleteRecords.rename);
        if ((taskName == 'table') && _renamedTables.length) {
            syncHelper.setMessage(`Renaming Tables(${JSON.stringify(_renamedTables)}) on the server`);
            request('/database/table/rename', { renamed: deleteRecords.rename })
                .then(res => {
                    DeleteSyncState.cleanUp(appName, deleteRecords, 'rename', res);
                    mainRequest()
                }, res => DeleteSyncState.fail(appName, res));
            return;
        }

        /**
         * 
         * @param {*} path 
         * @param {*} ref 
         * @param {*} data 
         */
        function request(path, data) {
            return syncHelper.request(appName, path, null, data);
        }

        function mainRequest() {
            if (!Object.keys(data).length) {
                return DeleteSyncState.done(appName, deleteRecords, serverResource, taskName);
            }
            //set message to our console
            syncHelper.setMessage(message);
            request(api, { remove: data }).then(
                res => DeleteSyncState.done(appName, deleteRecords, serverResource,  taskName, res), 
                res => DeleteSyncState.fail(appName, res));
        }

        mainRequest();
    }

    /**
     * 
     * @param {*} task 
     * @param {*} res 
     */
    static cleanUp(appName, deleteRecords, task, res) {
        const delRecordName = DatabaseSyncConnector.coreApi.storeMapping.delRecordName;
        const delRecordManager = DatabaseSyncConnector.coreApi.storageFacade.get(delRecordName, appName);
        const resData = res.renamed || res.removed;
        const totalTask = Object.keys(deleteRecords[task]);
        const isDataBaseTask = ('database' == task) && resData[appName];
        // check if records are fully processed
        totalTask.forEach(taskName => {
            if (resData.hasOwnProperty(taskName)) {
                if (('object' !== typeof resData[taskName]) && resData[taskName]) {
                    delete delRecordManager[appName][task][taskName];
                } else {
                    syncHelper.setMessage(resData[taskName].message);
                }
            } else {
                syncHelper.setMessage(`Unable to remove ${task} (${taskName}) from the server`);
            }
        });

        /**
         * check is request type was database
         */
        if (isDataBaseTask && (inc == totalTask.length)) {
            delete delRecordManager[appName];
        }

        //update the storage
        DatabaseSyncConnector
            .coreApi
            .storageFacade
            .set(delRecordName, delRecordManager, appName);
        /**
         * reset deletedRecords
         */
        if (inc == totalTask.length) {
            if (isDataBaseTask) {
                DatabaseSyncConnector
                    .coreApi
                    .closeDB(appName, true);
            } else {
                DatabaseSyncConnector
                    .coreApi
                    .getActiveDB(appName)
                    .get(DatabaseSyncConnector.coreApi.constants.RESOLVERS)
                    .deleteManager()
                    .reset();
            }
        }
    }

    /**
     * 
     * @param {*} taskName 
     */
    static done(appName, deleteRecords, taskName, res){
        if (res) {
            this.cleanUp(appName, deleteRecords, taskName, res);
        }

        if (taskName != 'database') {
            startSyncState(appName, serverResource, true);
        } else {
            syncHelper.finalizeProcess(appName);
        }
    }

    static fail(appName, res) {
        if (res.data && res.data.removed) {
            for (let tblName in res.data.removed) {
                syncHelper.setMessage(res.data.removed[tblName].message || "Unable to perform requested action.");
            }
        }
        syncHelper.setMessage('Failed to synchronize, please try again');
        syncHelper.killState(appName);
    }
}