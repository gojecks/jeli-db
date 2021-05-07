/**
 * register static method to Core
 */

function ApiMapper() {
    this._coreApiList = [];
    this.get = function(url) {
        if (url) {
            return this.find(url);
        }

        return this._coreApiList;
    };
}

ApiMapper.prototype.set = function(apiList) {
    if ($isArray(apiList)) {
        this._coreApiList.push.apply(this._coreApiList, apiList);
    } else if ($isObject(apiList)) {
        this._coreApiList.push(apiList);
    }
};
ApiMapper.prototype.remove = function(url) {
    this._coreApiList = this._coreApiList.filter(function(api) {
        return !$isEqual(api.URL, url);
    });
};

ApiMapper.prototype.clear = function() {
    this._coreApiList.length = 0;
};

ApiMapper.prototype.find = function(key, data) {
    return (data || this._coreApiList).filter(function(api) {
        return $isEqual(api.URL, key) || $isEqual(api.ref && api.ref, key);
    })[0]
};

/**
 * register instance of ApiMapper
 */
jEliDB.API = (new ApiMapper);