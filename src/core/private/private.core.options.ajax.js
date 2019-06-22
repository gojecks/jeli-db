/**
 * 
 * @param {*} dbName 
 * @param {*} tbl 
 * @param {*} requestState 
 * requestState can either be a STRING or OBJECT { URL:STRING, tbl:String, AUTH_TYPE:Boolean}
 */
_privateApi.prototype.buildOptions = function(dbName, tbl, requestState) {
    var options = {},
        cToken = $cookie('X-CSRF-TOKEN'),
        base64 = new Base64Fn(),
        networkResolver = this.$getActiveDB(dbName).$get('resolvers').networkResolver;
    options.url = networkResolver.serviceHost || "";
    options.__appName__ = dbName;
    options.data = {};
    options.dataType = "json";
    options.contentType = "application/json";
    options.headers = {
        Authorization: "Bearer *",
        'X-APP-ORGANISATION': networkResolver.organisation || '',
        'X-APP-NAME': dbName
    };

    /**
     * set X-CSRF-TOKEN
     * only when defined
     */
    if (cToken) {
        options.headers['X-CSRF-TOKEN'] = cToken;
    }

    requestState = networkResolver.requestMapping.get(requestState);
    if (requestState) {
        options.url += requestState.URL;
        tbl = tbl || requestState.tbl;
        if ($isArray(tbl)) {
            tbl = JSON.stringify(tbl);
        }

        //initialize our network interceptor
        (networkResolver.interceptor || function() {})(options, requestState);
        options.data._h = window.location.host;
        options.data._r = base64.encode(dbName + ':' + (tbl || '') + ':' + +new Date + ':' + networkResolver.nonce);
        options.type = requestState.METHOD;
        options.cache = requestState.CACHE || false;

        //options.getRequestHeader
        options.getResponseHeader = function(fn) {
            var _csrfToken = fn('X-CSRF-TOKEN');
            if (_csrfToken) {
                $cookie('X-CSRF-TOKEN', _csrfToken);
            }
        };
    } else {
        options.isErrorState = true;
    }
    // remove networkResolver instance
    networkResolver = null;
    return options;
};

/**
 * 
 * @param {*} options 
 */
_privateApi.prototype.$http = function() {
    var $ajax = AjaxSetup(null);
    return function(options) {
        var userDefinedAjax = this.getNetworkResolver('$ajax', options.__appName__);
        if (userDefinedAjax) {
            return userDefinedAjax(options);
        }

        return $ajax(options);
    };
}();