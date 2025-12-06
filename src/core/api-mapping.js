/**
 * 
 * @param {*} appName 
 */
class RequestMapping {
    static createInstance(name){
        return new this(name);
    }

    constructor(appName) {
        this.customApiRepository = [];
        this.isResolvedCustom = false;
        this.appName = appName;
    }

    /**
     *
     * @param {*} stateName
     */
    get(url, method) {
        return Database.API.find(url, this.customApiRepository, method)[0];
    }

    /**
     *
     * @param {*} stateName
     * @param {*} config
     */
    set(config) {
        if (config) {
            if (isarray(config)) {
                config.forEach(conf => this.set(conf));
            } else {
                const conf = this.customApiRepository.find((api) => (api.URL == config.URL));
                if (conf){
                    Object.assign(conf, config);
                } else {
                    this.customApiRepository.push(config);
                }
            }
        }

        return this;
    }
    
    getAllByClass(className) {
        return this.getAllBy('CTRL_NAME', className);
    }
    getByClass(className) {
        return this.getAllBy('CTRL_NAME', className);
    }
    getAllBy(name, value) {
        return this.customApiRepository.filter((api) => api[name] === value);
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
        const requestOptions = privateApi.buildHttpRequestOptions(this.appName, { path: '/functions' });
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
        this.customApiRepository = this.customApiRepository.filter(url => (url !== api.URL));
    }
}

/**
 * register static method to Core
 */
class ApiMapper {
    static coreApiRepository = [];

    static get(url) {
        return (url ? this.find(url)[0] : this.coreApiRepository);
    }

    /**
     *
     * @param {*} apiList
     */
    static set(apiList) {
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
    static remove(url) {
        this.coreApiRepository = this.coreApiRepository.filter(function (api) {
            return !isequal(api.URL, url);
        });
    }
    
    static clear() {
        this.coreApiRepository.length = 0;
    }
    /**
     *
     * @param {*} key
     * @param {*} data
     * @returns
     */
    static find(key, customApiRepository, method) {
        return this.coreApiRepository.concat(customApiRepository || []).filter(function (api) {
            return isequal(api.URL, key) && (!method || method === api.METHOD);
        });
    }
}