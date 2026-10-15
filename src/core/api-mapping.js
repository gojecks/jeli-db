/**
 * 
 * @param {*} appName 
 */
class RequestMapping {
    static createInstance(name) {
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
        return Database.API.find(url, this.customApiRepository, method);
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
                const conf = this.customApiRepository.find((api) => (api.URL === config.URL && api.METHOD === config.METHOD));
                if (conf) {
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
        return this.getAllBy('CTRL_NAME', className)[0];
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

        const requestOptions = privateApi.buildHttpRequestOptions(this.appName, { path: '/functions' });
        return privateApi.$http(requestOptions)
            .then(res => {
                this.isResolvedCustom = true;
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
        this.customApiRepository = this.customApiRepository.filter((api) => (api.URL !== url));
    }
}

/**
 * register static method to Core
 */
class ApiMapper {
    static coreApiRepository = [];

    static get(url) {
        return (url ? this.find(url) : this.coreApiRepository);
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
        const entry = key.split('/').filter(k => !!k).shift() || '';
        const matches = (api) => (
            api.URL.startsWith(`/${entry}`) &&
            (
                (
                    isequal(api.URL, key) ||
                    api.regex && new RegExp(api.regex).test(key)
                ) &&
                (!method || method === api.METHOD)
            )
        );
        return this.coreApiRepository.find(matches) ||
            (customApiRepository && customApiRepository.find(matches));
    }
}