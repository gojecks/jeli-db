/**
 * 
 * @param {*} core 
 * @param {*} currentVersion 
 * @param {*} previousVersion 
 * @param {*} schemaFilePath 
 */
function SchemaManager(core, currentVersion, previousVersion, schemaFilePath) {
    var schemaProcess = new CoreSchemaProcessService(core);
    /**
     * load schema
     */
    function loadSchema(version) {
        var path = schemaFilePath + "version_" + version + '.json';
        return privateApi.$http(path);
    }

    this.create = function(next, preEvent) {
        /**
         * check if schemaFilePath is Defined
         * 
         */
        if (!schemaFilePath || !isstring(schemaFilePath)) {
            return next();
        }

        preEvent();
        var _this = this;
        loadSchema(1)
            .then(function(schema) {
                schemaProcess.process(schema, function() {
                    /**
                     * Trigger the upgrade on create mode
                     * As this fixes the issue of lost data when table is altered in websql
                     */
                    _this.upgrade(next);
                });
            }, next);
    };

    this.upgrade = function(cb) {
        function performUpgrade() {
            previousVersion++;
            loadSchema(previousVersion)
                .then(function(schema) {
                    schemaProcess.process(schema, next);
                }, next);
        }

        function next() {
            if (currentVersion > previousVersion) {
                performUpgrade();
            } else {
                schemaProcess.processCrud(cb);
            }
        }

        next();
    };
}