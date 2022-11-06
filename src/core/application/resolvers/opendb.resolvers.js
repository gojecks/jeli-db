/**
 * 
 * @param {*} currentProcessTbl 
 */
function _resolveDeletedTable(currentProcessTbl) {
    return (confirm('Are you sure you want to drop table ' + currentProcessTbl));
}

function openedDBResolvers() {
    this.networkResolver = ({
        serviceHost: null,
        dirtyCheker: true,
        conflictResolver: null,
        resolveDeletedTable: _resolveDeletedTable,
        logger: [],
        logService: function() {},
        interceptor: function() {},
        deletedRecords: {
            table: {},
            database: {},
            rename: {}
        },
        handler: {
            onSuccess: function() {},
            onError: function() {}
        },
        "app_id": "*",
        inProduction: false,
        ignoreSync: [],
        $ajax: false
    });

    /**
     * 
     * @param {*} name 
     * @param {*} value 
     */
    this.register = function(name, value) {
        if (isobject(name) && !value) {
            this.networkResolver = extend(true, this.networkResolver, name);
        } else {
            this.networkResolver[name] = value;
        }

        return this;
    };
    /**
     * 
     * @param {*} name 
     */
    this.getResolvers = function(name) {
        return this.networkResolver[name] || '';
    };
};

/**
 * 
 * @param {*} name 
 */
openedDBResolvers.prototype.$hasOwnPropery = function(name) {
    return this.networkResolver.hasOwnProperty(name);
};

openedDBResolvers.prototype.trigger = function(fn) {
    var self = this;
    setTimeout(function() {
        fn.call(self);
    }, 1);

    return this;
};


/**
 * 
 * @param {*} dbName 
 */
openedDBResolvers.prototype.deleteManager = function(dbName) {
    return new deleteManager(dbName, this);
};