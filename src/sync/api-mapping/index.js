/**
 * 
 * @param {*} disableAdminApi 
 * @param {*} appName 
 */
function RequestMapping(disableAdminApi, appName) {
    var CUSTOM_API = [],
        isResolvedCustom = false;
    /**
     * 
     * @param {*} stateName 
     */
    function getPublicApi(url) {
        return (jEliDB.API.find(url) || jEliDB.API.find(url, CUSTOM_API));
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
        return jEliDeepCopy(jEliDB.API.get());
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
/**
 * register static method to Core
 */
jEliDB.API = new(function() {
    var coreApiList = [];
    this.set = function(apiList) {
        if ($isArray(apiList)) {
            coreApiList.push.apply(coreApiList, apiList);
        } else if ($isObject(apiList)) {
            coreApiList.push(apiList);
        }
    };

    this.get = function(url) {
        if (url) {
            return this.find(url);
        }

        return coreApiList;
    };

    this.remove = function(url) {
        coreApiList = coreApiList.filter(function(api) {
            return !$isEqual(api.URL, url);
        });
    };

    this.clear = function() {
        coreApiList.length = 0;
    };

    this.find = function(key, data) {
        return (data || coreApiList).filter(function(api) {
            return $isEqual(api.URL, key) || $isEqual(api.ref && api.ref, key);
        })[0]
    }
})();