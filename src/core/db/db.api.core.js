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
DBEvent.prototype.api = function(URL, postData, tbl) {
    var _options = $queryDB.buildOptions(this.name, tbl, URL),
        $defer = new _Promise();
    if (postData || ($isObject(URL) && URL.data)) {
        if (_options.type && $isEqual(_options.type.toLowerCase(), 'get')) {
            _options.data.query = postData || URL.data;
        } else {
            _options.data.postData = postData || URL.data;
        }
    }

    $queryDB.$http(_options)
        .then(function(res) {
            var ret = dbSuccessPromiseObject('api', "");
            ret.result = res.data;
            ret.__api__ = URL;
            $defer.resolve(ret);
        }, function(err) {
            $defer.reject((err.data || { message: "There was an error please try again later" }));
        });

    return $defer;
};