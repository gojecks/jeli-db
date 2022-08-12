/**
 * Sync ApplicationInstance METHOD
 */
function ApplicationInstanceSync() {
    if (privateApi.databaseContainer.has(this.name)) {
        return new DatabaseSynchronization(this.name, this.version);
    }

    function mockSync() {
        return {
            Entity: function() {
                return {
                    configSync: function() {
                        return {
                            processEntity: function(handler) {
                                return handler.onError({ state: "sync", message: "Database doesn't exists" });
                            }
                        }
                    }
                }
            },
            schemaManager: function() {
                return {};
            }
        }
    }

    return mockSync();
};