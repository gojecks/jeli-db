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
        var $defer = new _Promise();
        privateApi.$http(options)
            .then(function(res) {
                privateApi
                    .$resolveUpdate(appName, tbl, { insert: res._rec })
                    .then(function(_ret) {
                        jdbUpdateStorage(appName, tbl);
                        //resolve promise
                        $defer.resolve(sqlResultExtender(dbSuccessPromiseObject('select', ""), _ret.insert));
                    });

            }, function(res) {
                $defer.reject(dbErrorPromiseObject("Unable to fetch records"));
            });

        return $defer;
    }

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getByRef = function(tbl, query) {
        var _options = syncHelper.setRequestData(appName, '/database/query', true, tbl);
        _options.data.query = { type: "_ref", limit: "JDB_SINGLE", param: query };

        return requestFromDB(_options, tbl);
    };

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getAll = function(tbl, query) {
        var _options = syncHelper.setRequestData(appName, '/database/query', true, tbl);
        _options.data.query = { type: "_data", limit: "JDB_MAX", param: query };

        return requestFromDB(_options, tbl);
    };

    /**
     * 
     * @param {*} tbl 
     * @param {*} query 
     */
    this.getOne = function(tbl, query) {
        var _options = syncHelper.setRequestData(appName, '/database/query', true, tbl);
        _options.data.query = { type: "_data", limit: "JDB_SINGLE", param: query };

        return requestFromDB(_options, tbl);
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
        param: {
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
 */
clientService.prototype.query = function(query) {
    var _options = syncHelper.setRequestData(this.appName, '/database/query', false);
    _options.data.query = query;

    return syncHelper.processRequest(_options, null, this.appName);
};

/**
 * 
 * @param {*} query 
 * @param {*} tbl 
 */
clientService.prototype.getNumRows = function(query, tbl) {
    var _options = syncHelper.setRequestData(this.appName, '/database/num/rows', true, tbl);
    _options.data.query = { type: "_data", param: query, return_type: "num_rows" };

    return syncHelper.processRequest(_options, null, this.appName);
};