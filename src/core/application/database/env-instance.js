class ApplicationEnvInstance{
    constructor(appName) {
      this.name = appName;
    }

    get dataTypes(){
        return privateApi.getActiveDB(this.name).get(constants.DATATYPES);
    }

    get requestMapping() {
        return privateApi.getNetworkResolver('requestMapping', this.name);
    }

    logger() {
        return privateApi.getActiveDB(this.name).get(constants.RESOLVERS).getResolvers('logger');
    };

    resource() {
        return privateApi.getActiveDB(this.name).get(constants.RESOURCEMANAGER).getResource();
    }

    usage() {
        if (this.name && privateApi.databaseContainer.has(this.name)) {
            return (((privateApi.getStorage(this.name).usage(this.name)) * 2) / 1024).toFixed(2) + " KB";
        }

        return "unknown usuage";
    };
}