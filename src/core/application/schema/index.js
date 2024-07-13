/**
 * 
 * @param {*} core 
 * @param {*} currentVersion 
 * @param {*} previousVersion 
 * @param {*} schemaFilePath 
 */
class SchemaManager{
    static loadSchema(version, schemaFilePath) {
        var path = schemaFilePath + "version_" + version + '.json';
        return fetch(path).then(res => res.json());
    }
    constructor(core, currentVersion, previousVersion, schemaFilePath){
        this.schemaProcess = new CoreSchemaProcessService(core);
        this.currentVersion = currentVersion;
        this.previousVersion = previousVersion;
        this.schemaFilePath = schemaFilePath;
    }


    create(next, preEvent) {
        /**
         * check if schemaFilePath is Defined
         * 
         */
        if (!this.schemaFilePath || !isstring(this.schemaFilePath))
            return next();

        preEvent();
        SchemaManager.loadSchema(1, this.schemaFilePath)
            .then(schema => {
                this.schemaProcess.process(schema, () => {
                    /**
                     * Trigger the upgrade on create mode
                     * As this fixes the issue of lost data when table is altered in websql
                     */
                    this.upgrade(next);
                });
            }, next);
    };

    upgrade(cb) {
        var performUpgrade = () => {
            this.previousVersion++;
            SchemaManager.loadSchema(previousVersion, this.schemaFilePath)
                .then((schema) => {
                    this.schemaProcess.process(schema, next);
                }, next);
        };

        var next = () => {
            if (this.currentVersion > this.previousVersion) {
                performUpgrade();
            } else {
                this.schemaProcess.processCrud(cb);
            }
        };

        next();
    };
}