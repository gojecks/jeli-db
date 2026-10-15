/**
 * clientService()
 * @param {*} appName 
 */
class clientService {
    constructor(appName) {
        this.appName = appName;
    }

    /**
 * 
 * @param {*} tbl 
 * @param {*} query 
 */
    getByRef(tbl, query) {
        return this.pull(tbl, { type: "_ref", limit: "JDB_SINGLE" }, query);
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     * @param {*} byQueryId 
     * @returns 
     */
    getAll(tbl, query, byQueryId) {
        return this.pull(tbl, { limit: "JDB_MAX" }, query, byQueryId);
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    getOne(tbl, query) {
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
    pull(tbl, requestData, params, byQueryId) {
        const time = performance.now();
        const requestParams = privateApi.buildHttpRequestOptions(this.appName, { tbl, path: '/database/fetch' });
        // fetch mode
        requestData.mode = 1;
        // set the query only when required
        if (params) {
            if(byQueryId){
                requestData = params;
            } else if (['where', 'limit', 'byRefs'].some(key => !!params[key])) {
                Object.assign(requestData, params);
            } else {
                requestData.where = (!Array.isArray(params) ? [params] : params);
            }
        }
        
        if (!byQueryId && !requestData.where && !requestData.byRefs){
            // fail the request
            Promise.reject({message: 'Invalid request received'});
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
                            resolve(new SelectQueryEvent(ret.insert.data, (performance.now() - time)));
                        });
                }, res => reject(dbErrorPromiseObject("Unable to fetch records")));
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
    runQueryRequest(request, query, replacer, cacheOptions) {
        const requestParams = privateApi.buildHttpRequestOptions(this.appName, request)
        if (typeof query === "string" || replacer) {
            query = QueryBuilder.parseServerQuery(query, replacer);
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
    push(tbl, type, data) {
        return privateApi.autoSync(this.appName, tbl, type, data);
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
    query(query, replacer, cacheOptions) {
        return this.runQueryRequest({ path: '/database/query' }, query, replacer, cacheOptions);
    };

    /**
     * 
     * @param {*} query 
     * @param {*} replacer 
     * @param {*} cacheOptions 
     * @returns 
     */
    fetch(query, replacer, cacheOptions) {
        return this.runQueryRequest({ path: '/database/fetch' }, query, replacer, cacheOptions);
    };


    /**
     * 
     * @param {*} query 
     * @param {*} tbl 
     */
    getNumRows(param, tbl) {
        return this.runQueryRequest({ tbl, path: '/database/num/rows' }, { param, return_type: "num_rows" });
    };

}