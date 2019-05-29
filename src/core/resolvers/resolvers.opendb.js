/**
    CORE Resolvers
**/
function openedDBResolvers() {
    this.networkResolver = ({
        serviceHost: null,
        dirtyCheker: true,
        conflictResolver: function(response, currentProcessTbl, mergeConflictResolver, failedConflictResolver) {
            if (confirm('Update your table(' + currentProcessTbl + ') with Server records (yes/no)')) {
                syncHelper.setMessage('Updating Local(' + currentProcessTbl + ') with Server(' + currentProcessTbl + ')', this);
                mergeConflictResolver(response.conflictRecord, currentProcessTbl);
            } else {
                failedConflictResolver();
            }
        },
        resolveDeletedTable: function(currentProcessTbl) {
            return (confirm('Are you sure you want to drop table ' + currentProcessTbl));
        },
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
        if ($isObject(name) && !value) {
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
    var _self = this;
    return {
        init: function() {
            var $delRecords = getStorageItem(privateApi.storeMapping.delRecordName);
            if ($delRecords && $delRecords.hasOwnProperty(dbName)) {
                //update deleted records
                _self
                    .register('deletedRecords', $delRecords[dbName]);
            }

            return this;
        },
        isDeletedDataBase: function() {
            return _self.getResolvers('deletedRecords').database.hasOwnProperty(dbName);
        },
        isDeletedTable: function(name) {
            return _self.getResolvers('deletedRecords').table.hasOwnProperty(name);
        },
        reset: function() {
            _self.register('deletedRecords', {
                table: {},
                database: {},
                rename: {}
            });

            return this;
        },
        isExists: function() {
            var $delRecords = getStorageItem(privateApi.storeMapping.delRecordName);
            return $delRecords && $delRecords.hasOwnProperty(dbName);
        },
        getRecords: function() {
            return _self.getResolvers('deletedRecords');
        }
    };
};