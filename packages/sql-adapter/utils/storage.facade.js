/**
 * 
 * @param {*} generateStruct 
 */
class StorageFacade {
    constructor(generateStruct) {
        this.generateStruct = generateStruct
    }

    /**
     *
     * @param {*} name
     */
    usage(name) {
        return JSON.stringify(this.getItem(name) || '').length;
    }

    /**
     *
     * @param {*} name
     */
    getItem(name) {
        if (!name) {
            return this.generateStruct(_privateStore);
        }

        return _privateStore[name];
    }

    /**
     *
     * @param {*} name
     * @param {*} item
     */
    setItem(name, item) {
        _privateStore[name] = item;
        _sqlFacade.query('INSERT OR REPLACE INTO _JELI_STORE_ (_rev, _data) VALUES (?,?)', [name, JSON.stringify(item)])
            .then(function () { });
    }

    removeItem(name) {
        _sqlFacade.query('DELETE FROM _JELI_STORE_ WHERE _rev=?', [name])
            .then(function () {
                delete _privateStore[name];
            });

        return true;
    }
    
    clear() {
        _sqlFacade.query('DELETE FROM _JELI_STORE_', [])
            .then(function () {
                _privateStore = {};
            });
    }

    isExists(key) {
        return _privateStore.hasOwnProperty(key);
    }

    broadcast(eventName, args) {
        if (_eventRegistry.has(eventName)) {
            _eventRegistry.get(eventName).apply(null, args);
        }
    }
};




