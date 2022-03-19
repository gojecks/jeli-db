/**
 * 
 * @param {*} appName 
 */
function liveProcessor(appName) {
    var ignoreSync = privateApi.getNetworkResolver('ignoreSync', appName);
    var autoSync = privateApi.getNetworkResolver('live', appName);
    var recordResolver = privateApi.getActiveDB(appName).get(constants.RECORDRESOLVERS);
    /**
     * 
     * @param {*} type 
     * @param {*} cbSuccess 
     * @param {*} cbError 
     */
    return function(tbl, type) {
        return new DBPromise(function(resolve, reject) {
            if (autoSync && !$inArray(tbl, ignoreSync)) {
                //process the request
                //Synchronize PUT STATE
                var dataToSync = recordResolver.get(tbl, null, 'data');
                if (Object.keys(dataToSync.data[type]).length) {
                    syncHelper.autoSync(appName, tbl, dataToSync)
                        .then(resolve, reject);
                } else {
                    dataToSync = null;
                    resolve();
                }
            } else {
                resolve();
            }

            // update storage
            privateApi.updateDB(appName, tbl);
        });
    };
}