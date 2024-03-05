function ApplicationEnvInstance(appName) {
    this.name = appName;
    this.logger = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOLVERS).getResolvers('logger');
    };

    this.resource = function() {
        return privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
    }

    this.usage = function() {
        if (appName && privateApi.databaseContainer.has(appName)) {
            return (((privateApi.getStorage(appName).usage(appName)) * 2) / 1024).toFixed(2) + " KB";
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