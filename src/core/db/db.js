/**
 * 
 * @param {*} name 
 * @param {*} version 
 * @param {*} required 
 */
function ApplicationInstance(name, version, required) {
    //set the DB name for reference
    this.name = name;
    this.version = version;
    this.env = {
        usage: function() {
            if (name && privateApi.openedDB.$hasOwnProperty(name)) {
                return (((privateApi.$getActiveDB(name).$get('_storage_').usage(name)) * 2) / 1024).toFixed(2) + " KB";
            }

            return "unknown usuage";
        },
        logger: function() {
            return privateApi.$getActiveDB(name).$get('resolvers').getResolvers('logger');
        },
        dataTypes: privateApi.$getActiveDB(name).$get('dataTypes'),
        requestMapping: privateApi.getNetworkResolver('requestMapping', name),
        resource: function() {
            return privateApi.$getActiveDB(name).$get('resourceManager').getResource();
        }
    };

    if (privateApi.getNetworkResolver('serviceHost', name)) {
        //add event listener to db
        this.onUpdate = new ApplicationRealtime('db', name, null);
        // clientService
        this.clientService = new clientService(name);
        //@Function Name getApiKey
        //Objective : get the current user APIKEY from the server
        //only when its available
        this.env.appkey = function(key) {
            var _options = privateApi.buildOptions(name, '', 'apikey'),
                logService = privateApi.getNetworkResolver('logService');
            _options.data.key = key;
            logService('Retrieving Api Key and Secret..');
            //perform ajax call
            return ProcessRequest(_options, null, name);
        };
        // application scheduler
        this.scheduler = new ApplicationScheduler(name);
    }

    /**
     * 
     * @param {*} flag 
     */
    this.close = function(flag) {
        //drop the DB if allowed
        privateApi.closeDB(name, flag);
    };

    if (required && $isArray(required)) {
        var ret = {},
            self = this;
        required.filter(function(name) {
            ret[name] = self[name];
        });

        return ret;
    }
}