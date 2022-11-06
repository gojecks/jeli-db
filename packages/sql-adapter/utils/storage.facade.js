/**
 * 
 * @param {*} generateStruct 
 */
function StorageFacade(generateStruct) {
    /**
     * 
     * @param {*} name 
     */
    this.usage = function(name) {
        return JSON.stringify(this.getItem(name) || '').length;
    };

    /**
     * 
     * @param {*} name 
     */
    this.getItem = function(name) {
        if (!name) {
            return generateStruct(_privateStore);
        }

        return _privateStore[name];
    };

    /**
     * 
     * @param {*} name 
     * @param {*} item 
     */
    this.setItem = function(name, item) {
        _privateStore[name] = item;
        _sqlFacade.query('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)', [name, JSON.stringify(item)])
            .then(function() {});
    };
};

StorageFacade.prototype.removeItem = function(name) {
    _sqlFacade.query('DELETE FROM _JELI_STORE_ WHERE _rev=?', [name])
        .then(function() {
            delete _privateStore[name];
        });

    return true;
};

StorageFacade.prototype.clear = function() {
    _sqlFacade.query('DELETE FROM _JELI_STORE_', [])
        .then(function() {
            _privateStore = {};
        });
};

StorageFacade.prototype.isExists = function(key) {
    return _privateStore.hasOwnProperty(key);
};

StorageFacade.prototype.broadcast = function(eventName, args) {
    if (_eventRegistry.has(eventName)) {
        _eventRegistry.get(eventName).apply(null, args);
    }
};