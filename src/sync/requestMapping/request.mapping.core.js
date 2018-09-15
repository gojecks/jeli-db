/**
 * Request Mapping
 */
function RequestMapping(disableAdminApi, appName) {
    var CUSTOM_API = [];
    /**
     * 
     * @param {*} stateName 
     */
    function getPublicApi(stateName) {
        var proc = function(api) {
            return $isEqual(api.URL, stateName) || $isEqual(api.ref && api.ref, stateName);
        };

        return (JDB_REQUEST_API.filter(proc)[0] || CUSTOM_API.filter(proc)[0]);
    }

    /**
     * 
     * @param {*} stateName 
     */
    this.get = function(stateName) {
        $api = getPublicApi(stateName);
        if ($api && disableAdminApi && $api.PROTECTED_API) {
            return null;
        }

        return $api;
    };

    /**
     * 
     * @param {*} stateName 
     * @param {*} config 
     */
    this.set = function(config) {
        if (config || !CUSTOM_API.some(function(api) { return api.URL == config.URL; })) {
            CUSTOM_API.push(config)
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
        if (disableAdminApi) {
            return;
        }

        $queryDB.$http($queryDB.buildOptions(appName, '', '/load'))
            .then(function(res) {
                if ($isArray(res.data)) {
                    CUSTOM_API = extend(true, CUSTOM_API, res.data || []);
                }
            });
    };
}