/**
 * 
 * @param {*} config 
 * @param {*} callback 
 */
function DefaultStorage(config, callback) {
    var _storage = window[config.type] || {},
        _publicApi_ = {};
    _publicApi_.setItem = function(name, value) {
        value = JSON.stringify(value);
        var filesizeCheck = Math.floor((((value.length) * 2) / 1024).toFixed(2));
        if (filesizeCheck >= (1024 * 10)) {
            privateApi.getNetworkResolver('logService')("_STORAGE_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
            return;
        }

        _storage[name] = value;
    };

    _publicApi_.getItem = function(name) {
        return (_storage[name] && JSON.parse(_storage[name])) || undefined;
    };

    _publicApi_.removeItem = function(name) {
        delete _storage[name];
    };

    _publicApi_.clear = function() {
        _storage.clear && _storage.clear();
    };

    _publicApi_.usage = function(name) {
        return (_storage[name] || '').length;
    };

    _publicApi_.rename = function(oldName, newName, cb) {
        var oldData = this.getItem(oldName);
        Object.keys(oldData.tables).forEach(function(tbl) {
            oldData.tables[tbl].DB_NAME = newName;
            oldData.tables[tbl].lastModified = +new Date
        });
        this.setItem(newName, oldData);
        this.setItem(privateApi.getResourceName(newName), this.getItem(privateApi.getResourceName(oldName)));
        privateApi.$getActiveDB(oldName).$get('recordResolvers').rename(newName);
        this.removeItem(oldName);
        (cb || noop)();
    };
    // trigger our callback
    setTimeout(callback);
    return _publicApi_;
}

/**
 * register Storage
 */
Storage('memory', DefaultStorage);
Storage('localStorage', DefaultStorage);
Storage('sessionStorage', DefaultStorage);