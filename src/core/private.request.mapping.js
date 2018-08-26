/**
 * Request Mapping
 */
function RequestMapping() {
    /**
     * requestApis
     */
    var requestApis = {
        remdb: {
            path: "/drop/database",
            authType: 'bearer'
        },
        remtbl: {
            path: "/drop/table",
            authType: 'bearer',
        },
        rentbl: {
            path: "/rename/table",
            authType: 'bearer'
        },
        sync: {
            path: "/sync/state",
            authType: 'bearer'
        },
        push: {
            path: "/push/state",
            authType: 'bearer'
        },
        resput: {
            path: "/resource",
            authType: 'basic'
        },
        resget: {
            path: "/resource",
            authType: 'basic'
        },
        pull: {
            path: "/pull",
            authType: 'bearer'
        },
        schema: {
            path: "/schema",
            authType: 'basic'
        },
        query: {
            path: "/query",
            authType: 'bearer'
        },
        'delete': {
            path: "/delete",
            authType: 'bearer'
        },
        gnr: {
            path: "/get/num/rows",
            authType: 'basic'
        },
        repdb: {
            path: '/replicate/db',
            authType: 'bearer'
        },
        rendb: {
            path: '/rename/database',
            authType: 'bearer'
        },
        poll: {
            path: "/recent/updates",
            authType: 'bearer'
        },
        rmdbauth: {
            path: "/database/users/rights/remove",
            authType: 'bearer'
        },
        adbauth: {
            path: "/database/users/rights/add",
            authType: 'bearer'
        },
        reauth: {
            path: "/user/reauthorize",
            authType: 'basic'
        },
        crusr: {
            path: '/user/create',
            authType: 'basic'
        },
        upusr: {
            path: "/user/update",
            authType: 'bearer'
        },
        authusr: {
            path: "/user/authorize",
            authType: 'basic'
        },
        vldpaswd: {
            path: "/user/validate/password",
            authType: 'basic'
        },
        usr_exists: {
            path: "/user/exists",
            authType: 'basic'
        },
        usr_del: {
            path: "/user/delete",
            authType: "bearer"
        }
    };

    this.get = function(stateName) {
        return requestApis[stateName] || ({
            path: stateName,
            authType: "bearer"
        });
    };

    this.set = function(stateName, config) {
        requestApis[stateName] = (config || {
            "path": stateName,
            authType: "bearer"
        });

        return this;
    }
}