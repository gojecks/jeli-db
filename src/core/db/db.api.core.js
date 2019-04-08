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
ApplicationInstance.prototype.api = function(URL, postData, tbl) {
    var _options = privateApi.buildOptions(this.name, tbl, URL),
        $defer = new _Promise();
    // set the postData
    postData = postData || URL.data;
    if (postData) {
        if (_options.type && $isEqual(_options.type.toLowerCase(), 'get')) {
            _options.data.query = postData;
        } else if (postData instanceof FormData) {
            // append all data into formData
            Object.keys(_options.data).forEach(function(prop) {
                postData.append(prop, _options.data[prop]);
            });
            _options.data = postData;
            _options.contentType = false;
            _options.processData = false;
        } else {
            _options.data.postData = postData;
        }
    }

    privateApi.$http(_options)
        .then(function(res) {
            var ret = dbSuccessPromiseObject('api', "");
            ret.result = res;
            ret.__api__ = URL;
            $defer.resolve(ret);
        }, function(err) {
            $defer.reject((err.data || { message: "There was an error please try again later" }));
        });

    return $defer;
};