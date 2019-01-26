/**
 * LIBRARY REQUEST MAPPING
 */

var JDB_REQUEST_API = [{
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/database/rights"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/load"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/apikey"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/cms/content/file"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/file/attachment"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/session"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/num/rows"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/user/exists"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/directory/listing"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/pull"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/logs"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/schema"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/application/info"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/application/environment/variables"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/query"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/resource"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/recent/updates"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/regenerate"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/create"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/validate"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/session"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/code/resend"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/code/validate"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/password"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/logout"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/user/validate/password"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/user/authorize"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/user/reauthorize"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/rename/database"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/rename/table"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/export/database"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/send/email"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/cms/create/file"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/cms/create/directory"
    },
    {
        URL: '/create/api',
        AUTH_TYPE: 1,
        METHOD: "POST",
        PROTECTED_API: true,
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/replicate"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/users/add"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/resource"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/cms/update/file"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/file/attachment"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/session"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/user/update"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 0,
        METHOD: "PUT",
        URL: "/user/create"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/state/push"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/state/sync"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/update"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/unpublish"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/environment/variables",
        ref: "app_env_put"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/set/security_nonce"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/set/access_token"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/authority/add"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/application/authority/remove"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/publish"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/session"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/cms/remove/file"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/user/database/remove"
    },
    {
        PROTECTED_API: false,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/user/remove"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/cms/remove/directory"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/drop/database"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/drop/table"
    },
    {
        PROTECTED_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/log"
    }
];