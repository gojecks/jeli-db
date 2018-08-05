  //@Function Name : clientService
  //@return OBJECT
  function clientService(appName) {
      this.appName = appName;
      //@Function GET
      //Objective  : Query a database
      function requestFromDB(options, tbl) {
          var $defer = new $p();
          $queryDB.$http(options)
              .then(function(res) {
                  $queryDB
                      .$resolveUpdate(appName, tbl, { insert: res.data._rec })
                      .then(function(_ret) {
                          jEliUpdateStorage(appName, tbl);
                          //resolve promise
                          $defer.resolve(sqlResultExtender(dbSuccessPromiseObject('select', ""), _ret.insert));
                      });

              }, function(res) {
                  $defer.reject(dbErrorPromiseObject("Unable to fetch records"));
              });

          return $defer;
      }

      //Request From Api using Ref ID
      this.getByRef = function(tbl, query) {
          var _options = syncHelper.setRequestData(appName, 'query', true, tbl);
          _options.data.query = { type: "_ref", limit: "JDB_SINGLE", param: query };

          return requestFromDB(_options, tbl);
      };

      //get all data that matches query
      this.getAll = function(tbl, query) {
          var _options = syncHelper.setRequestData(appName, 'query', true, tbl);
          _options.data.query = { type: "_data", limit: "JDB_MAX", param: query };

          return requestFromDB(_options, tbl);
      };

      //get one data that matches query
      this.getOne = function(tbl, query) {
          var _options = syncHelper.setRequestData(appName, 'query', true, tbl);
          _options.data.query = { type: "_data", limit: "JDB_SINGLE", param: query };

          return requestFromDB(_options, tbl);
      };

  }

  /**
    ProcessRequest
    @param: options
    @return: promise
  **/
  function ProcessRequest(_options, resolvedTable, appName) {
      var $defer = new $p();
      //perform JSON Task
      $queryDB.$http(_options)
          .then(function(res) {
              $defer.resolve(res.data);
              if (resolvedTable) {
                  //empty our local recordResolver
                  $queryDB
                      .$getActiveDB(appName)
                      .$get('recordResolvers')
                      .$isResolved(resolvedTable)
                      .updateTableHash(res.data.$hash);
              }
          }, function(res) {
              $defer.reject(res);
          });

      return $defer;
  }

  //@Function Put
  //Objectives : Update the Table Records
  clientService.prototype.put = function(tbl, data) {
      var _options = syncHelper.setRequestData(this.appName, 'push', false, tbl, "PUT");
      _options.data.postData = data;
      _options.data.action = 'update';
      return ProcessRequest(_options, tbl, this.appName);
  };

  //@Function Delete
  //Objectives : remove data from a table
  clientService.prototype.delete = function(tbl, data) {
      var _options = syncHelper.setRequestData(this.appName, 'delete', true, tbl, "DELETE");
      _options.data.query = data;
      return ProcessRequest(_options);
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

  clientService.prototype.query = function(query) {
      var _options = syncHelper.setRequestData(this.appName, 'query', false);
      _options.data.query = query;

      return ProcessRequest(_options);

  };

  /**
    get Num rows from DB
  **/
  clientService.prototype.getNumRows = function(query, tbl) {
      var _options = syncHelper.setRequestData(this.appName, 'gnr', true, tbl);
      _options.data.query = { type: "_data", param: query, return_type: "num_rows" };

      return ProcessRequest(_options);
  };

  //Revalidate Expired Users
  clientService.prototype.reAuthorize = function(data) {
      var _options = syncHelper.setRequestData(this.appName, 'reauth', false, null, "POST");
      _options.data.postData = data;
      return ProcessRequest(_options);
  };