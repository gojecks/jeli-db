//api AJAX request
//@params : request Type , State , postData, table_name
//

/**
 * 
 * @param {*} URL
 * @param {*} postData 
 * @param {*} tbl 
 * requestState can either be a STRING or OBJECT 
 * { 
 *   URL:STRING,
 *   tbl:String,
 *   AUTH_TYPE:Boolean,
 *   METHOD:STRING, data:ANY
 * }
 */
var CacheMechanism = new Map();
ApplicationInstance.prototype.api = function(URL, postData, tbl) {
    var options = privateApi.buildOptions(this.name, tbl, URL),
        $defer = new _Promise();
    if (options.cache && CacheMechanism.has(URL)) {
        var result = CacheMechanism.get(URL);
        $defer.resolve(result);
    } else {
        // set the postData
        postData = postData;
        if (postData) {
            if (options.type && $isEqual(options.type.toLowerCase(), 'get')) {
                options.data.query = postData;
            } else if (postData instanceof FormData) {
                // append all data into formData
                Object.keys(options.data).forEach(function(prop) {
                    postData.append(prop, options.data[prop]);
                });
                options.data = postData;
                options.contentType = false;
                options.processData = false;
            } else {
                options.data.postData = postData;
            }
        }

        privateApi.$http(options)
            .then(function(res) {
                var ret = dbSuccessPromiseObject('api', "");
                ret.result = res;
                ret.__api__ = URL;
                $defer.resolve(ret);
                if (options.cache) {
                    CacheMechanism.set(URL, ret);
                }
            }, function(err) {
                $defer.reject((err.data || { message: "There was an error please try again later" }));
            });
    }

    return $defer;
};