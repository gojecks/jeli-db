/**
 * 
 * @param {*} dbName 
 * @param {*} tbl 
 * @param {*} requestState 
 */
_privateApi.prototype.buildOptions = function(dbName, tbl, requestState) {
    var options = {},
        tbl = (($isArray(tbl)) ? JSON.stringify(tbl) : tbl),
        cToken = $cookie('X-CSRF-TOKEN');
    options.url = this.getNetworkResolver('serviceHost', dbName);
    options.data = {};
    options.dataType = "json";
    options.contentType = "application/json";
    options.headers = {
        Authorization: "Bearer *"
    };

    if (cToken) {
        options.headers['X-CSRF-TOKEN'] = cToken;
    }

    //initialize our network interceptor
    (this.getNetworkResolver('interceptor', dbName) || function() {})(options, requestState);

    options.data._o = new Base64Fn().encode(window.location.origin);
    options.data._p = window.location.pathname;
    options.data._h = window.location.host;
    options.data._r = new Base64Fn().encode(dbName + ':' + requestState + ':' + (tbl || '') + ':' + +new Date + ':' + this.getNonce(dbName));

    //options.getRequestHeader
    options.getResponseHeader = function(fn) {
        var _csrfToken = fn('X-CSRF-TOKEN');
        if (_csrfToken) {
            $cookie('X-CSRF-TOKEN', _csrfToken);
        }
    };

    return options;
};