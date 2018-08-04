/**
 * 
 * @param {*} tbl 
 * @param {*} dbName
 * @return {FUNCTION} 
 */
function liveProcessor(tbl, dbName) {
    function syncService(data, cbSuccess, cbError) {
        new jEliDBSynchronization(dbName)
            .Entity()
            .configSync({})[$queryDB.getNetworkResolver('inProduction', dbName) ? 'put' : 'push'](tbl, data)
            .then(cbSuccess, cbError);
    }

    /**
     * @param {STRING} type
     * @param {FUNCTION} CB
     */
    return function(type, cbSuccess, cbError) {
        if ($queryDB.getNetworkResolver('live', dbName) && !expect($queryDB.getNetworkResolver('ignoreSync', dbName)).contains(tbl)) {
            //process the request
            //Synchronize PUT STATE
            var dataToSync = $queryDB.$getActiveDB(dbName).$get('recordResolvers').$get(tbl, null, 'data');
            if (expect(['update', 'insert', 'delete']).contains(type) && Object.keys(dataToSync.data[type]).length) {
                syncService(dataToSync, cbSuccess, cbError);
            } else {
                dataToSync = null;
                cbSuccess({});
            }
        } else {
            cbSuccess({});
        }
    };
}