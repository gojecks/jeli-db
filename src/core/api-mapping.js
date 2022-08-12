/**
 * 
 * @param {*} appName 
 */
function RequestMapping(appName) {
    var customApiRepository = [];
    var isResolvedCustom = false;
    /**
     * 
     * @param {*} stateName 
     */
    this.get = function(url, method) {
        return Database.API.find(url, customApiRepository, method)[0];
    };

    /**
     * 
     * @param {*} stateName 
     * @param {*} config 
     */
    this.set = function(config) {
        if (config) {
            if ($isArray(config)) {
                customApiRepository = customApiRepository.concat(config);
            } else if (!customApiRepository.some(function(api) { return api.URL == config.URL; })) {
                customApiRepository.push(config);
            }
        }

        return this;
    };

    Object.defineProperties(this, {
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
        customApiRepository: {
            get: function() {
                return customApiRepository;
            },
            set: function(value) {
                customApiRepository = extend(true, customApiRepository, value);
            }
        }
    });
}

RequestMapping.prototype.getAllByClass = function(className) {
    return this.customApiRepository.filter(function(api) {
        return api.CTRL_NAME === className;
    });
};

RequestMapping.prototype.getByClass = function(className) {
    return this.getAllByClass(className)[0];
};

RequestMapping.prototype.getAllClientApis = function() {
    return copy(Database.API.get(), true);
};

RequestMapping.prototype.getAllCustomApis = function() {
    return copy(this.customApiRepository, true);
};

/**
 * load customApiRepositoryS
 * loaded APIS is only for dev purpose
 */
RequestMapping.prototype.resolveCustomApis = function() {
    if (this.isResolvedCustom) {
        return this;
    }

    this.isResolvedCustom = true;
    var self = this;
    var requestOptions = privateApi.buildHttpRequestOptions(this.appName, { path: '/application/api' });
    return privateApi.$http(requestOptions)
        .then(function(res) {
            if ($isArray(res)) {
                self.customApiRepository = res;
            }
        });
};

/**
 * remove api from list
 * @param {*} url
 */
RequestMapping.prototype.removeApi = function(url) {
    this.customApiRepository = this.customApiRepository.filter(function(api) {
        return (url !== api.URL);
    });
};

/**
 * register static method to Core
 */
function ApiMapper() {
    this.coreApiRepository = [];
    this.get = function(url) {
        if (url)
            return this.find(url)[0];
        return this.coreApiRepository;
    };

    /**
     * 
     * @param {*} apiList 
     */
    this.set = function(apiList) {
        if ($isArray(apiList)) {
            this.coreApiRepository.push.apply(this.coreApiRepository, apiList);
        } else if ($isObject(apiList)) {
            this.coreApiRepository.push(apiList);
        }
    };
}


/**
 * 
 * @param {*} url 
 */
ApiMapper.prototype.remove = function(url) {
    this.coreApiRepository = this.coreApiRepository.filter(function(api) {
        return !$isEqual(api.URL, url);
    });
}

ApiMapper.prototype.clear = function() {
    this.coreApiRepository.length = 0;
}

/**
 * 
 * @param {*} key 
 * @param {*} data 
 * @returns 
 */
ApiMapper.prototype.find = function(key, customApiRepository, method) {
    return this.coreApiRepository.concat(customApiRepository || []).filter(function(api) {
        return $isEqual(api.URL, key) && (!method || method === api.METHOD);
    });
}

/**
 * register instance of ApiMapper
 */
Database.API = (new ApiMapper);