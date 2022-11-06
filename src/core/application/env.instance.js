function ApplicationEnvInstance(appName) {
    this.name = appName;
    this.logger = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOLVERS).getResolvers('logger');
    };

    this.resource = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
    }

    //@Function Name getApiKey
    //Objective : get the current user APIKEY from the server
    //only when its available
    this.appkey = function(key) {
        var _options = privateApi.buildHttpRequestOptions(appName, { path: '/application/key' });
        var logService = privateApi.getNetworkResolver('logService');
        _options.data.key = 'api_key';
        logService('Retrieving Api Key and Secret..');
        //perform ajax call
        return syncHelper.processRequest(_options, null, appName);
    };

    this.usage = function() {
        if (appName && privateApi.databaseContainer.has(appName)) {
            return (((privateApi.getActiveDB(appName).get(constants.STORAGE).usage(appName)) * 2) / 1024).toFixed(2) + " KB";
        }

        return "unknown usuage";
    };

    Object.defineProperty(this, 'dataTypes', {
        get: function() {
            return privateApi.getActiveDB(appName).get(constants.DATATYPES);
        }
    });

    Object.defineProperty(this, 'requestMapping', {
        get: function() {
            return privateApi.getNetworkResolver('requestMapping', appName);
        }
    });
}