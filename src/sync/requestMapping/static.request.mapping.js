/**
 * LIBRARY REQUEST MAPPING
 * CLIENT AND ADMIN 
 */

var ADMIN_REQUEST_MAPPING = {
    remdb: {
        path: "/drop/database",
        authType: 'bearer',
        method: "DELETE"
    },
    remtbl: {
        path: "/drop/table",
        authType: 'bearer',
        method: "DELETE"
    },
    rentbl: {
        path: "/rename/table",
        authType: 'bearer',
        method: "POST"
    },
    sync: {
        path: "/sync/state",
        authType: 'bearer',
        method: "PUT"
    },
    resput: {
        path: "/resource",
        authType: 'basic',
        method: "PUT"
    },
    pull: {
        path: "/pull",
        authType: 'bearer',
        method: "GET"
    },
    repdb: {
        path: '/replicate/db',
        authType: 'bearer',
        method: "PUT"
    },
    rendb: {
        path: '/rename/database',
        authType: 'bearer',
        method: "POST"
    },
    rmdbauth: {
        path: "/database/users/rights/remove",
        authType: 'bearer',
        method: "DELETE"
    },
    adbauth: {
        path: "/database/users/rights/add",
        authType: 'bearer',
        method: "PUT"
    }
};

var CLIENT_REQUEST_MAPPING = {
    schema: {
        path: "/schema",
        authType: 'basic',
        method: "GET"
    },
    resget: {
        path: "/resource",
        authType: 'basic',
        method: "GET"
    },
    push: {
        path: "/push/state",
        authType: 'bearer',
        method: "PUT"
    },
    poll: {
        path: "/recent/updates",
        authType: 'bearer',
        method: "GET"
    },
    query: {
        path: "/query",
        authType: 'bearer',
        method: "GET"
    },
    'delete': {
        path: "/delete",
        authType: 'bearer',
        method: "DELETE"
    },
    gnr: {
        path: "/get/num/rows",
        authType: 'basic',
        method: "GET"
    },
    reauth: {
        path: "/user/reauthorize",
        authType: 'basic',
        method: "POST"
    },
    crusr: {
        path: '/user/create',
        authType: 'basic',
        method: "PUT"
    },
    upusr: {
        path: "/user/update",
        authType: 'bearer',
        method: "PUT"
    },
    authusr: {
        path: "/user/authorize",
        authType: 'basic',
        method: "POST"
    },
    vldpaswd: {
        path: "/user/validate/password",
        authType: 'basic',
        method: "POST"
    },
    usr_exists: {
        path: "/user/exists",
        authType: 'basic',
        method: "POST"
    },
    usr_del: {
        path: "/user/delete",
        authType: "bearer",
        method: "DELETE"
    },
    reset_passwd: {
        path: "/reset/password",
        authType: "basic",
        method: "POST"
    },
    resend_validation_code: {
        path: "/resend/validation/code",
        authType: "basic",
        method: "POST"
    },
    reset_passwd_validate: {
        path: "/reset/passwd/validate",
        authType: "basic",
        method: "POST"
    }
};