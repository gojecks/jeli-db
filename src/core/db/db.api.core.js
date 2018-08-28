//api AJAX request
//@params : request Type , State , postData, table_name
//

/**
 * 
 * @param {*} type 
 * @param {*} state 
 * @param {*} postData 
 * @param {*} tbl 
 */
DBEvent.prototype.api = function(state, postData, tbl) {
    var _options = $queryDB.buildOptions(this.name, tbl, state),
        $defer = new $p();
    if (postData) {
        if ($isEqual(_options.type.toLowerCase(), 'get')) {
            _options.data.query = postData;
        } else {
            _options.data.postData = postData;
        }
    }

    $queryDB.$http(_options)
        .then(function(res) {
            var ret = dbSuccessPromiseObject('api', "");
            ret.result = res.data;
            ret.__api__ = state;
            $defer.resolve(ret);
        }, function(err) {
            $defer.reject((err.data || { message: "There was an error please try again later" }));
        });

    return $defer;
};