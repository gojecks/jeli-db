/** DataBase Prototype **/
//jEliDB Events
function DBEvent(name,version,required)
{
    //set the DB name for reference
    this.name = name;
    this.version = version;
    this.env = {
        usage : function()
        {
          if(name && $queryDB.hasOwnProperty(name))
          {
              return ((($queryDB.$getActiveDB(name).$get('_storage_').usage(name)) * 2) / 1024).toFixed(2)+" KB";
          }

          return  "unknown usuage";
        },
        logger : function()
        {
          var data = $queryDB.$getActiveDB(name).$get('resourceManager').getResource();

          return (data);
        },
        //@Function Name getApiKey
        //Objective : get the current user APIKEY from the server
        //only when its available
        appkey : function()
        {
          var _options = $queryDB.buildOptions(name,'','apikey'),
              logService = $queryDB.getNetworkResolver('logService');
              _options.type = "POST";

          logService('Retrieving Api Key and Secret..');
            //perform ajax call
            return ProcessRequest(_options); 
        }
    };

    if($queryDB.getNetworkResolver('serviceHost')){
          //add event listener to db
      this.onUpdate = jDBStartUpdate('db',name,null);

      // clientService
      this.clientService = new clientService(name);
    }

   if(required && $isArray(required)){
      var ret = {},
          self = this;
      required.filter(function(name){
        ret[name] = self[name];
      });

      return ret;
    }
}
