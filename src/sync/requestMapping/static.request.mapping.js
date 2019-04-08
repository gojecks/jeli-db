/**
 * LIBRARY REQUEST MAPPING
 */

var JDB_REQUEST_API = [{
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/database/rights"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 2,
        "URL": "/load"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/service/configuration"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/apikey"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/file/attachment"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/logs"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/session"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 2,
        "URL": "/num/rows"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 2,
        "URL": "/user/exists"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/directory/listing"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/content/file"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/pull"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 2,
        "URL": "/schema"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/info"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/environment/variables"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/query"
    },
    {
        "METHOD": "GET",
        "PROTECTED_API": false,
        "AUTH_TYPE": 2,
        "URL": "/resource"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/recent/updates"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/otp/regenerate"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/otp/create"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/otp/validate"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/session"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/reset/code/resend"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/reset/code/validate"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/reset/password"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/logout"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/user/validate/password"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/user/authorize"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/user/reauthorize"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/create/file"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/create/directory"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/rename/database"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/rename/table"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/export/database"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/send/email"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/create/api"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/database/replicate"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/database/users/add"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/database/resource"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/file/attachment"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/session"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/user/update"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 0,
        "URL": "/user/create"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/state/push"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/state/sync"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/update/file"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/update"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/unpublish"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/environment/variables"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/set/security_nonce"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/set/access_token"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/authority/add"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/authority/remove"
    },
    {
        "METHOD": "PUT",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/application/publish"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/session"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/user/database/remove"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": false,
        "AUTH_TYPE": 1,
        "URL": "/user/remove"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/logs/remove"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/drop/database"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/drop/table"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/remove/file"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/cms/remove/directory"
    },
    {
        "METHOD": "DELETE",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/log"
    },
    {
        "METHOD": "POST",
        "PROTECTED_API": true,
        "AUTH_TYPE": 1,
        "URL": "/omise/payment"
    }
];