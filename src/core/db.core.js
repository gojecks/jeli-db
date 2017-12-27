/**
 * 
 * @param {*} name 
 * @param {*} version 
 * @param {*} required 
 */
function DBEvent(name, version, required) {
    //set the DB name for reference
    this.name = name;
    this.version = version;
    this.env = {
        usage: function() {
            if (name && $queryDB.openedDB.$hasOwnProperty(name)) {
                return ((($queryDB.$getActiveDB(name).$get('_storage_').usage(name)) * 2) / 1024).toFixed(2) + " KB";
            }

            return "unknown usuage";
        },
        logger: function() {
            return $queryDB.$getActiveDB(name).$get('resourceManager').getResource();
        },
        dataTypes: $queryDB.$getActiveDB(name).$get('dataTypes')
    };

    if ($queryDB.getNetworkResolver('serviceHost')) {
        //add event listener to db
        this.onUpdate = jDBStartUpdate('db', name, null);

        // clientService
        this.clientService = new clientService(name);

        //@Function Name getApiKey
        //Objective : get the current user APIKEY from the server
        //only when its available
        this.env.appkey = function() {
            var _options = $queryDB.buildOptions(name, '', 'apikey'),
                logService = $queryDB.getNetworkResolver('logService');
            _options.type = "POST";

            logService('Retrieving Api Key and Secret..');
            //perform ajax call
            return ProcessRequest(_options);
        }
    }

    if (required && $isArray(required)) {
        var ret = {},
            self = this;
        required.filter(function(name) {
            ret[name] = self[name];
        });

        return ret;
    }
}