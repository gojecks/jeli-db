/**
 * clientService()
 * @param {*} appName 
 */
function clientService(appName) {
    this.appName = appName;
}

/**
 * 
 * @param {*} tbl 
 * @param {*} query 
 */
clientService.prototype.getByRef = function (tbl, query) {
    return this.pull(tbl, { type: "_ref", limit: "JDB_SINGLE" }, query);
}

/**
 * 
 * @param {*} tbl 
 * @param {*} query 
 * @param {*} byQueryId 
 * @returns 
 */
clientService.prototype.getAll = function (tbl, query, byQueryId) {
    return this.pull(tbl, { limit: "JDB_MAX" }, query, byQueryId);
}

/**
 * 
 * @param {*} tbl 
 * @param {*} query 
 */
clientService.prototype.getOne = function (tbl, query) {
    return this.pull(tbl, { limit: "JDB_SINGLE" }, query);
};


/**
     * 
     * @param {*} appName 
     * @param {*} tbl 
     * @param {*} requestData 
     * @param {*} params 
     * @param {*} byQueryId 
     * @returns 
     */
clientService.prototype.pull = function(tbl, requestData, params, byQueryId) {
    var time = performance.now();
    var requestParams = privateApi.buildHttpRequestOptions(this.appName, { tbl, path: '/database/fetch' });
    // fetch mode
    requestData.mode = 1;
    // set the query only when required
    if (params) {
        if (byQueryId || params.where) {
            Object.assign(requestData, params);
        } else {
            requestData.where = (!Array.isArray(params) ? [params] : params);
        }
    }
    requestParams.data = requestData;

    return new Promise((resolve, reject) => {
        privateApi.$http(requestParams)
            .then(res => {
                privateApi
                    .resolveUpdate(this.appName, tbl, { insert: res })
                    .then(ret => {
                        privateApi.updateDB(this.appName, tbl);
                        //resolve promise
                        resolve(new SelectQueryEvent(ret.insert, (performance.now() - time)));
                    });
            }, function (res) {
                reject(dbErrorPromiseObject("Unable to fetch records"));
            });
    });
}


/**
 * 
 * @param {*} request 
 * @param {*} query 
 * @param {*} replacer 
 * @param {*} cacheOptions 
 * @returns 
 */
clientService.prototype.runQueryRequest = function(request, query, replacer, cacheOptions) {
    var requestParams = privateApi.buildHttpRequestOptions(this.appName, request)
    if (typeof query === "string" || replacer) {
        query = parseServerQuery(query, replacer);
    }
    requestParams.data = query;
    requestParams.cache = cacheOptions;
    return privateApi.$http(requestParams);
}





/**
 * 
 * @param {*} tbl 
 * @param {*} data 
 */
clientService.prototype.push = function (tbl, data) {
    return privateApi.autoSync(this.appName, tbl, data);
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
/**
 * 
 * @param {*} query 
 * @param {*} replacer 
 * @param {*} cacheOptions 
 * @returns 
 */
clientService.prototype.query = function (query, replacer, cacheOptions) {
    return this.runQueryRequest({ path: '/database/query' }, query, replacer, cacheOptions);
};

/**
 * 
 * @param {*} query 
 * @param {*} replacer 
 * @param {*} cacheOptions 
 * @returns 
 */
clientService.prototype.fetch = function (query, replacer, cacheOptions) {
    return this.runQueryRequest({ path: '/database/fetch' }, query, replacer, cacheOptions);
};


/**
 * 
 * @param {*} query 
 * @param {*} tbl 
 */
clientService.prototype.getNumRows = function (param, tbl) {
    return this.runQueryRequest({ tbl, path: '/database/num/rows' }, { param, return_type: "num_rows" });
};