/**
 * 
 * @param {*} dbName 
 * @param {*} tbl 
 * @param {*} requestState 
 */
_privateApi.prototype.buildOptions = function(dbName, tbl, requestState) {
    var options = {},
        tbl = (($isArray(tbl)) ? JSON.stringify(tbl) : tbl),
        cToken = $cookie('X-CSRF-TOKEN'),
        base64 = new Base64Fn();
    options.__appName__ = dbName;
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

    requestState = this.requestMapping.get(requestState);
    state = requestState.path;

    //state needs to be split for accuracy
    if ($inArray("/", state)) {
        state = state.split("/");
        //remove the first slash
        state.shift();
        state = camelCase.call(state.join('-'));
    }

    //initialize our network interceptor
    (this.getNetworkResolver('interceptor', dbName) || function() {})(options, requestState.authType);

    options.data._o = base64.encode(window.location.origin);
    options.data._p = window.location.pathname;
    options.data._h = window.location.host;
    options.data._r = base64.encode(dbName + ':' + state + ':' + (tbl || '') + ':' + +new Date + ':' + this.getNonce(dbName));

    //options.getRequestHeader
    options.getResponseHeader = function(fn) {
        var _csrfToken = fn('X-CSRF-TOKEN');
        if (_csrfToken) {
            $cookie('X-CSRF-TOKEN', _csrfToken);
        }
    };

    return options;
};

/**
 * 
 * @param {*} options 
 */
_privateApi.prototype.$http = function(options) {
    var $ajax = this.getNetworkResolver('$ajax', options.__appName__) || ajax;
    if (!$isFunction($ajax)) {
        errorBuilder('$http is not a function');
    }

    return $ajax(options);
};

_privateApi.prototype.requestMapping = new RequestMapping();