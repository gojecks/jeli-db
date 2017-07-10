  //@Function Name : clientService
  //@return OBJECT
function clientService(appName)
{
  this.appName = appName;
  //@Function GET
  //Objective  : Query a database
  function requestFromDB(options, tbl){
    var $defer = new $p();
    ajax(options)
    .then(function(res)
    {
      $queryDB
      .$resolveUpdate(appName,tbl,{insert:res.data._rec})
      .then(function(_ret)
      {
        $queryDB.$taskPerformer
        .updateDB(appName,tbl);
        //resolve promise
        $defer.resolve(sqlResultExtender(dbSuccessPromiseObject('select',""),_ret.insert));
      });

    },function(res)
    {
      $defer.reject(dbErrorPromiseObject("Unable to fetch records"));
    });

      return $defer;
  }

  //Request From Api using Ref ID
  this.getByRef = function(tbl,query)
  {
      var _options = syncHelper.setRequestData(appName,'query',true,tbl);
          _options.data.query = {type:"_ref",limit:"JDB_SINGLE",param:query};
      
      return requestFromDB(_options,tbl);
  };

  //get all data that matches query
  this.getAll = function(tbl,query){
      var _options = syncHelper.setRequestData(appName,'query',true,tbl);
          _options.data.query = {type:"_data",limit:"JDB_MAX",param:query};
      
      return requestFromDB(_options,tbl);
  };

  //get one data that matches query
  this.getOne = function(tbl,query){
      var _options = syncHelper.setRequestData(appName,'query',true,tbl);
          _options.data.query = {type:"_data",limit:"JDB_SINGLE",param:query};
      
      return requestFromDB(_options,tbl);
  };

}

/**
  ProcessRequest
  @param: options
  @return: promise
**/
function ProcessRequest(_options, _recordResolvers){
  var $defer = new $p();
  //perform JSON Task
    ajax(_options)
      .then(function(res)
      {
        $defer.resolve(res.data);
        if(_recordResolvers){
          //empty our local recordResolver
          _recordResolvers.updateTableHash(res.data.$hash);
        }
      },function(res)
      {
        $defer.reject(res);
      });

      return $defer;
}

//@Function Put
//Objectives : Update the Table Records
clientService.prototype.put = function(tbl,data)
{
  var _options = syncHelper.setRequestData(this.appName, 'push',false,tbl);
      _options.data.postData = data;
      _options.data.action = 'update';
      _options.type = "PUT";

     return ProcessRequest(_options, $queryDB.$getActiveDB(this.appName).$get('recordResolvers').$isResolved(tbl));
};

//@Function Delete
//Objectives : remove data from a table
clientService.prototype.delete = function(tbl,data)
{
    var _options = syncHelper.setRequestData(this.appName, 'delete',true,tbl);
       _options.data.query = data;
       _options.type = "DELETE";

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

clientService.prototype.query = function(query){
  var _options = syncHelper.setRequestData(this.appName, 'query',false);
  _options.data.query = query;
  _options.type = 'GET';

  return ProcessRequest(_options);

};

/**
  get Num rows from DB
**/
clientService.prototype.getNumRows = function(query,tbl){
    var _options = syncHelper.setRequestData(this.appName, 'getNumRows',true,tbl);
    _options.data.query = {type:"_data",param:query,return_type:"num_rows"};
    _options.type = "GET";
      
   return ProcessRequest(_options);
};

//Revalidate Expired Users
clientService.prototype.reAuthorize = function(data){
  var _options = syncHelper.setRequestData(this.appName, 'reauthorize',false);
    _options.data.postData = data;
    _options.type = "POST";

    return ProcessRequest(_options);
};