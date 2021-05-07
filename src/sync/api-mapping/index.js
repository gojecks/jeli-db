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
        return (jEliDB.API.find(url) || jEliDB.API.find(url, dbCustomApis));;
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
    return copy(jEliDB.API.get(), true);
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
    privateApi.$http(privateApi.buildOptions(this.appName, '', '/application/api'))
        .then(function(res) {
            if ($isArray(res)) {
                self.dbCustomApis = res;
            }
        });

    return this;
};

/**
 * remove api from list
 * @param {*} obj 
 */
RequestMapping.prototype.removeApi = function(obj) {
    self.dbCustomApis = self.dbCustomApis.filter(function(api) {
        return (obj !== api);
    });
};