/**
    CORE Resolvers
**/
function openedDBResolvers() {
    this.networkResolver = ({
        serviceHost: null,
        dirtyCheker: true,
        conflictResolver: null,
        logger: [],
        logService: function() {},
        interceptor: function() {},
        deletedRecords: {
            table: {},
            database: {}
        },
        handler: {
            onSuccess: function() {},
            onError: function() {}
        },
        "app_id": "*",
        inProduction: false,
        ignoreSync: []
    });

    this.register = function(name, value) {
        if ($isObject(name) && !value) {
            this.networkResolver = extend(this.networkResolver, name);
        } else {
            this.networkResolver[name] = value;
        }

        return this;
    };

    this.getResolvers = function(name) {
        return this.networkResolver[name] || '';
    };
};