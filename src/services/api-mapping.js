/**
 * 
 * @param {*} disableAdminApi 
 * @param {*} appName 
 */
function RequestMapping(disableAdminApi, appName) {
    var dbCustomApis = [];
    var isResolvedCustom = false;
    /**
     * 
     * @param {*} stateName 
     */
    this.get = function(url) {
        return (Database.API.find(url) || Database.API.find(url, dbCustomApis));;
    };

    /**
     * 
     * @param {*} stateName 
     * @param {*} config 
     */
    this.set = function(config) {
        if (config) {
            if ($isArray(config)) {
                dbCustomApis = dbCustomApis.concat(config);
            } else if (!dbCustomApis.some(function(api) { return api.URL == config.URL; })) {
                dbCustomApis.push(config);
            }
        }

        return this;
    };

    Object.defineProperties(this, {
        disableAdminApi: {
            get: function() {
                return disableAdminApi;
            }
        },
        appName: {
            get: function() {
                return appName;
            }
        },
        isResolvedCustom: {
            get: function() {
                isResolvedCustom = false;
            },
            set: function() {
                if (isResolvedCustom) return;
                isResolvedCustom = true;
            }
        },
        dbCustomApis: {
            get: function() {
                return dbCustomApis;
            },
            set: function(value) {
                dbCustomApis = extend(true, dbCustomApis, value);
            }
        }
    });
}

RequestMapping.prototype.getAllClientApis = function() {
    return copy(Database.API.get(), true);
};

RequestMapping.prototype.getAllCustomApis = function() {
    return copy(this.dbCustomApis, true);
};

/**
 * load dbCustomApisS
 * loaded APIS is only for dev purpose
 */
RequestMapping.prototype.resolveCustomApis = function() {
    if (this.disableAdminApi || this.isResolvedCustom) {
        return this;
    }

    this.isResolvedCustom = true;
    var self = this;
    var requestOptions = privateApi.buildOptions(this.appName, '', '/application/api');
    privateApi.$http(requestOptions)
        .then(function(res) {
            if ($isArray(res)) {
                self.dbCustomApis = res;
            }
        });

    return this;
};

/**
 * remove api from list
 * @param {*} url
 */
RequestMapping.prototype.removeApi = function(url) {
    self.dbCustomApis = self.dbCustomApis.filter(function(api) {
        return (url !== api.URL);
    });
};

/**
 * register static method to Core
 */
function ApiMapper() {
    this._coreApiList = [];
}

ApiMapper.prototype.get = function(url) {
    if (url) {
        return this.find(url);
    }

    return this._coreApiList;
}

/**
 * 
 * @param {*} apiList 
 */
ApiMapper.prototype.set = function(apiList) {
    if ($isArray(apiList)) {
        this._coreApiList.push.apply(this._coreApiList, apiList);
    } else if ($isObject(apiList)) {
        this._coreApiList.push(apiList);
    }
}

/**
 * 
 * @param {*} url 
 */
ApiMapper.prototype.remove = function(url) {
    this._coreApiList = this._coreApiList.filter(function(api) {
        return !$isEqual(api.URL, url);
    });
}

ApiMapper.prototype.clear = function() {
    this._coreApiList.length = 0;
}

/**
 * 
 * @param {*} key 
 * @param {*} data 
 * @returns 
 */
ApiMapper.prototype.find = function(key, data) {
    return (data || this._coreApiList).filter(function(api) {
        return $isEqual(api.URL, key) || $isEqual(api.ref && api.ref, key);
    })[0]
}

/**
 * register instance of ApiMapper
 */
Database.API = (new ApiMapper);