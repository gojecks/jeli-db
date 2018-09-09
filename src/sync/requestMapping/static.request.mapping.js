/**
 * LIBRARY REQUEST MAPPING
 */

var JDB_REQUEST_API = [{
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/database/rights"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/load"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/apikey"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/file/content"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/file/attachment"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/session"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/num/rows"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/user/exists"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/directory/listing"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/pull"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/logs"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/schema"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/application/info"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/application/environment/variables"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/query"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 2,
        METHOD: "GET",
        URL: "/resource"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "GET",
        URL: "/recent/updates"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/regenerate"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/create"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/otp/validate"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/session"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/code/resend"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/code/validate"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/reset/password"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/logout"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/user/validate/password"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/user/authorize"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "POST",
        URL: "/user/reauthorize"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/rename/database"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/rename/table"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/export/database"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/send/email"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/create/file"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "POST",
        URL: "/create/directory"
    },
    {
        URL: '/create/api',
        AUTH_TYPE: 1,
        METHOD: "POST",
        PROTECT_API: true,
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/replicate"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/users/add"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/database/resource"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/file/content"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/file/attachment"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/session"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/user/update"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 0,
        METHOD: "PUT",
        URL: "/user/create"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/state/push"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/state/sync"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/update"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/unpublish"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/environment/variables",
        ref: "app_env_put"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/set/security_nonce"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/set/access_token"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/authority/add"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/authority/remove"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "PUT",
        URL: "/application/publish"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/session"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/file"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/user/database/remove"
    },
    {
        PROTECT_API: false,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/user/remove"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/folder"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/drop/database"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/drop/table"
    },
    {
        PROTECT_API: true,
        AUTH_TYPE: 1,
        METHOD: "DELETE",
        URL: "/log"
    }
];