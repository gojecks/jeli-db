function ApplicationEnvInstance(appName) {
    this.name = appName;
    this.logger = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOLVERS).getResolvers('logger');
    };

    this.resource = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
    }

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

//@Function Name getApiKey
//Objective : get the current user APIKEY from the server
//only when its available
ApplicationEnvInstance.prototype.appkey = function(key) {
    var _options = privateApi.buildOptions(this.name, '', 'apikey');
    var logService = privateApi.getNetworkResolver('logService');
    _options.data.key = key;
    logService('Retrieving Api Key and Secret..');
    //perform ajax call
    return ProcessRequest(_options, null, this.name);
};

ApplicationEnvInstance.prototype.usage = function() {
    if (this.name && privateApi.databaseContainer.has(this.name)) {
        return (((privateApi.getActiveDB(this.name).get(constants.STORAGE).usage(this.name)) * 2) / 1024).toFixed(2) + " KB";
    }

    return "unknown usuage";
};