//api AJAX request
//@params : request Type , State , postData, table_name
//
DBEvent.prototype.api = function(type, state, postData, tbl) {
    //state needs to be split for accuracy
    if (expect(state).contains("/")) {
        state = state.split("/");
        //remove the first slash
        state.shift();
        state = camelCase.call(state.join('-'));
    }

    var _options = $queryDB.buildOptions(this.name, tbl, state),
        $defer = new $p();
    _options.type = type || 'GET';
    if (postData) {
        if (type.toLowerCase() === 'get') {
            _options.data.query = postData;
        } else {
            _options.data.postData = postData;
        }
    }

    ajax(_options)
        .then(function(res) {
            var ret = dbSuccessPromiseObject(state, "");
            ret.result = res.data;
            $defer.resolve(ret);
        }, function(err) {
            $defer.reject((err.data || {}).error);
        });

    return $defer;
};