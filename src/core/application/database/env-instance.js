class ApplicationEnvInstance{
    constructor(appName) {
      this.name = appName;
    }

    get dataTypes(){
        return privateApi.getActiveDB(appName).get(constants.DATATYPES);
    }

    get requestMapping() {
        return privateApi.getNetworkResolver('requestMapping', appName);
    }

    logger() {
        return privateApi.getActiveDB(appName).get(constants.RESOLVERS).getResolvers('logger');
    };

    resource() {
        return privateApi.getActiveDB(appName).get(constants.RESOURCEMANAGER).getResource();
    }

    usage() {
        if (appName && privateApi.databaseContainer.has(appName)) {
            return (((privateApi.getStorage(appName).usage(appName)) * 2) / 1024).toFixed(2) + " KB";
        }

        return "unknown usuage";
    };
}