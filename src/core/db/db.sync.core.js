/**
 * Sync ApplicationInstance METHOD
 */
function ApplicationInstanceCore() {
    if (privateApi.openedDB.has(this.name)) {
        return new jEliDBSynchronization(this.name, this.version);
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