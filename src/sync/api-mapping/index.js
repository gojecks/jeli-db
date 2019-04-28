/**
 * Request Mapping
 */
function RequestMapping(disableAdminApi, appName) {
    var CUSTOM_API = [],
        JDB_REQUEST_API = require("./api.json"),
        isResolvedCustom = false;
    /**
     * 
     * @param {*} stateName 
     */
    function getPublicApi(url) {
        var proc = function(api) {
            return $isEqual(api.URL, url) || $isEqual(api.ref && api.ref, url);
        };

        return (JDB_REQUEST_API.filter(proc)[0] || CUSTOM_API.filter(proc)[0]);
    }

    /**
     * 
     * @param {*} stateName 
     */
    this.get = function(url) {
        return getPublicApi(url);
    };

    /**
     * 
     * @param {*} stateName 
     * @param {*} config 
     */
    this.set = function(config) {
        if (config) {
            if ($isArray(config)) {
                CUSTOM_API = CUSTOM_API.concat(config);
            } else if (!CUSTOM_API.some(function(api) { return api.URL == config.URL; })) {
                CUSTOM_API.push(config);
            }
        }

        return this;
    };

    this.getAllClientApis = function() {
        return jEliDeepCopy(JDB_REQUEST_API);
    };

    this.getAllCustomApis = function() {
        return jEliDeepCopy(CUSTOM_API);
    };

    /**
     * load CUSTOM_APIS
     * loaded APIS is only for dev purpose
     */
    this.resolveCustomApis = function() {
        if (disableAdminApi || isResolvedCustom) {
            return this;
        }

        isResolvedCustom = true;
        privateApi.$http(privateApi.buildOptions(appName, '', '/application/api'))
            .then(function(res) {
                if ($isArray(res)) {
                    CUSTOM_API = extend(true, CUSTOM_API, res);
                }
            });

        return this;
    };
}