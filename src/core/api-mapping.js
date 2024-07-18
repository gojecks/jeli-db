/**
 * 
 * @param {*} appName 
 */
class RequestMapping {
    constructor(appName) {
        var customApiRepository = [];
        var isResolvedCustom = false;
        this.appName = appName;
        /**
         *
         * @param {*} stateName
         */
        this.get = function (url, method) {
            return Database.API.find(url, customApiRepository, method)[0];
        };

        /**
         *
         * @param {*} stateName
         * @param {*} config
         */
        this.set = function (config) {
            if (config) {
                if (isarray(config)) {
                    customApiRepository = customApiRepository.concat(config);
                } else if (!customApiRepository.some(function (api) { return api.URL == config.URL; })) {
                    customApiRepository.push(config);
                }
            }

            return this;
        };

        Object.defineProperties(this, {
            isResolvedCustom: {
                get: function () {
                    isResolvedCustom = false;
                },
                set: function () {
                    if (isResolvedCustom) return;
                    isResolvedCustom = true;
                }
            },
            customApiRepository: {
                get: function () {
                    return customApiRepository;
                },
                set: function (value) {
                    customApiRepository = extend(true, customApiRepository, value);
                }
            }
        });
    }
    
    getAllByClass(className) {
        return this.getAllBy('CTRL_NAME', className);
    }
    getByClass(className) {
        return this.getAllBy('CTRL_NAME', className);
    }
    getAllBy(name, value) {
        return this.customApiRepository.filter(function (api) {
            return api[name] === value;
        });
    }
    getAllClientApis() {
        return copy(Database.API.get(), true);
    }
    getAllCustomApis() {
        return copy(this.customApiRepository, true);
    }
    /**
     * load customApiRepositoryS
     * loaded APIS is only for dev purpose
     */
    resolveCustomApis() {
        if (this.isResolvedCustom) {
            return this;
        }

        this.isResolvedCustom = true;
        var requestOptions = privateApi.buildHttpRequestOptions(this.appName, { path: '/application/api' });
        return privateApi.$http(requestOptions)
            .then(res => {
                if (isarray(res)) {
                    this.customApiRepository = copy(res);
                }
            });
    }
    /**
     * remove api from list
     * @param {*} url
     */
    removeApi(url) {
        this.customApiRepository = this.customApiRepository.filter(function (api) {
            return (url !== api.URL);
        });
    }
}








/**
 * register static method to Core
 */
class ApiMapper {
    constructor() {
        this.coreApiRepository = [];
    }

    get(url) {
        if (url)
            return this.find(url)[0];
        return this.coreApiRepository;
    }

    /**
     *
     * @param {*} apiList
     */
    set(apiList) {
        if (isarray(apiList)) {
            this.coreApiRepository.push.apply(this.coreApiRepository, apiList);
        } else if (isobject(apiList)) {
            this.coreApiRepository.push(apiList);
        }
    }

    /**
     *
     * @param {*} url
     */
    remove(url) {
        this.coreApiRepository = this.coreApiRepository.filter(function (api) {
            return !isequal(api.URL, url);
        });
    }
    
    clear() {
        this.coreApiRepository.length = 0;
    }
    /**
     *
     * @param {*} key
     * @param {*} data
     * @returns
     */
    find(key, customApiRepository, method) {
        return this.coreApiRepository.concat(customApiRepository || []).filter(function (api) {
            return isequal(api.URL, key) && (!method || method === api.METHOD);
        });
    }
}





/**
 * register instance of ApiMapper
 */
Database.API = (new ApiMapper);