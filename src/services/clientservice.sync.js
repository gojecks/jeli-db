/**
 * 
 * @param {*} query 
 * @param {*} replacer 
 * @returns 
 */
function _parseQueryString(query, replacer) {
    if (typeof query === "string") {
        query = parseServerQuery(query, replacer);
    }

    return query;
}

/**
 * clientService()
 * @param {*} appName 
 */
function clientService(appName) {
    this.appName = appName;
    /**
     * 
     * @param {*} options 
     * @param {*} tbl 
     */
    function requestFromDB(options, tbl) {
        var time = performance.now();
        return new DBPromise(function(resolve, reject) {
            privateApi.$http(options)
                .then(function(res) {
                    privateApi
                        .resolveUpdate(appName, tbl, { insert: res._rec })
                        .then(function(_ret) {
                            privateApi.updateDB(appName, tbl);
                            //resolve promise
                            resolve(new SelectQueryEvent(_ret.insert, (performance.now() - time)));
                        });

                }, function(res) {
                    reject(dbErrorPromiseObject("Unable to fetch records"));
                });
        });
    }

    /**
     * 
     * @param {*} limit 
     * @param {*} params 
     * @returns 
     */
    function setParams(tbl, type, limit, params) {
        var requestParams = syncHelper.setRequestData(appName, '/database/fetch', true, tbl);
        /**
         * support for non array params
         */
        if (!Array.isArray(params)) {
            params = [params];
        }

        requestParams.data.query = { type: type || "_", limit: limit, where: params, mode: 1 };
        return requestParams
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getByRef = function(tbl, query) {
        return requestFromDB(setParams(tbl, "_ref", "JDB_SINGLE", query), tbl);
    };

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getAll = function(tbl, query) {
        return requestFromDB(setParams(tbl, null, "JDB_MAX", query), tbl);
    };

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getOne = function(tbl, query) {
        return requestFromDB(setParams(tbl, null, "JDB_SINGLE", query), tbl);
    };

}



/**
 * 
 * @param {*} tbl 
 * @param {*} data 
 */
clientService.prototype.push = function(tbl, data) {
    return syncHelper.autoSync(this.appName, tbl, data);
};

/**
 * 
 * @param {*} tbl 
 * @param {*} data 
 */
clientService.prototype.delete = function(tbl, data) {
    var _options = syncHelper.setRequestData(this.appName, '/database/push', true, tbl);
    _options.data.query = data;
    return syncHelper.processRequest(_options, null, this.appName);
};

/**
  @params : query
  {
    tables:{
      "tbl_name":{
        type:"_data",
        limit:"JDB_MAX"
        where: {
            "column": VAL,
        },
        join:{
          table:"TBL_NAME",
          on:"VAL"
        }
      }
    }
  }
**/
clientService.prototype.query = function(query, replacer, cacheOptions) {
    var requestParams = syncHelper.setRequestData(this.appName, '/database/query', false);
    requestParams.data.query = _parseQueryString(query, replacer);
    requestParams.cache = cacheOptions;

    return syncHelper.processRequest(requestParams, null, this.appName);
};


/**
 * 
 * @param {*} query 
 * @param {*} tbl 
 */
clientService.prototype.getNumRows = function(query, tbl) {
    var requestParams = syncHelper.setRequestData(this.appName, '/database/num/rows', true, tbl);
    requestParams.data.query = { param: query, return_type: "num_rows" };

    return syncHelper.processRequest(requestParams, null, this.appName);
};