class openedDBResolvers {
    networkResolver = ({
        serviceHost: null,
        dirtyCheker: true,
        conflictResolver: null,
        resolveDeletedTable: (currentProcessTbl) => confirm('Are you sure you want to drop table ' + currentProcessTbl),
        logger: [],
        logService: noop,
        interceptor: noop,
        deletedRecords: {
            table: {},
            database: {},
            rename: {}
        },
        handler: {
            onSuccess: noop,
            onError: noop
        },
        appKey: "*",
        inProduction: false,
        ignoreSync: [],
        $ajax: false
    });
    constructor() { }

    get() {
        return this.networkResolver;
    }

    /**
     *
     * @param {*} name
     * @param {*} value
     */
    register(name, value) {
        if (isobject(name) && !value) {
            this.networkResolver = Object.assign(this.networkResolver, name);
        } else {
            this.networkResolver[name] = value;
        }

        return this;
    }

    /**
     *
     * @param {*} name
     */
    getResolvers(name) {
        return this.networkResolver[name] || '';
    }

    /**
     *
     * @param {*} name
     */
    has(name) {
        return this.networkResolver.hasOwnProperty(name);
    }

    trigger(fn) {
        setTimeout(() => fn.call(this), 1);
        return this;
    }
    /**
     *
     * @param {*} dbName
     */
    deleteManager(dbName) {
        return new deleteManager(dbName, this);
    }
};