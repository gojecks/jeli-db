/**
 * register static method to Core
 */
jEliDB.API = new(function() {
    var coreApiList = [];
    this.set = function(apiList) {
        if ($isArray(apiList)) {
            coreApiList.push.apply(coreApiList, apiList);
        } else if ($isObject(apiList)) {
            coreApiList.push(apiList);
        }
    };

    this.get = function(url) {
        if (url) {
            return this.find(url);
        }

        return coreApiList;
    };

    this.remove = function(url) {
        coreApiList = coreApiList.filter(function(api) {
            return !$isEqual(api.URL, url);
        });
    };

    this.clear = function() {
        coreApiList.length = 0;
    };

    this.find = function(key, data) {
        return (data || coreApiList).filter(function(api) {
            return $isEqual(api.URL, key) || $isEqual(api.ref && api.ref, key);
        })[0]
    };
})();