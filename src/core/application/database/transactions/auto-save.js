/**
 * 
 * @param {*} appName 
 * @param {*} tbl 
 * @param {*} type 
 * @returns 
 */
function liveProcessor(appName, tbl, type) {
    var ignoreSync = privateApi.getNetworkResolver('ignoreSync', appName);
    var recordResolver = privateApi.getActiveDB(appName).get(constants.RECORDRESOLVERS);

    return new DBPromise(function(resolve, reject) {
        if (!$inArray(tbl, ignoreSync)) {
            //process the request
            //Synchronize PUT STATE
            var dataToSync = recordResolver.get(tbl, null, 'data');
            if (dataToSync.data[type] && dataToSync.data[type].length) {
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
}