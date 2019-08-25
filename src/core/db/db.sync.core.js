/**
 * Sync ApplicationInstance METHOD
 */
ApplicationInstance.prototype.synchronize = function() {
    if (privateApi.openedDB.$hasOwnProperty(this.name)) {
        return new jEliDBSynchronization(this.name);
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