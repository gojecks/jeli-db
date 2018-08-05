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
        if ($queryDB.getNetworkResolver('live', dbName) && !$inArray(tbl, $queryDB.getNetworkResolver('ignoreSync', dbName))) {
            //process the request
            //Synchronize PUT STATE
            var dataToSync = $queryDB.$getActiveDB(dbName).$get('recordResolvers').$get(tbl, null, 'data');
            if ($inArray(type, ['update', 'insert', 'delete']) && Object.keys(dataToSync.data[type]).length) {
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