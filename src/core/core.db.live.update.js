/**
 * 
 * @param {*} type 
 * @param {*} dbName 
 * @param {*} tbl 
 * @param {*}  
 */
function jDBStartUpdate(type, dbName, tbl, $hash) {
    var _callback = function() {},
        timerId,
        ctimer,
        destroyed = false,
        _def = ["insert", "update", "delete"],
        $payLoad,
        withRef = false;

    function pollUpdate() {
        var _reqOptions = $queryDB.buildOptions(dbName, null, "update");
        _reqOptions.data.ref = type;
        _reqOptions.data.type = _def;

        var promiseData = {};

        function resolvePromise(_tbl, _data) {
            $queryDB
                .$resolveUpdate(dbName, _tbl, _data, withRef)
                .then(function(cdata) {
                    $queryDB
                        .$taskPerformer
                        .updateDB(dbName, _tbl, function(table) {
                            if (_data.checksum) {
                                table.$hash = _data.checksum;
                            }
                        });

                    promiseData[_tbl] = cdata;

                });
        }

        var _queryPayload = {};
        if (tbl) {
            _queryPayload[tbl] = {
                query: $isFunction($payLoad) ? $payLoad() : $payLoad
            };
        }


        switch (type) {
            case ('db'):
                if (!$payLoad) {
                    $queryDB.getDbTablesNames(dbName).forEach(function(name) {
                        _queryPayload[name] = {};
                    });
                } else {
                    _queryPayload = ($isFunction($payLoad)) ? $payLoad() : $payLoad;
                }
                break;
        }

        for (var _tbl in _queryPayload) {
            _queryPayload[_tbl].checksum = $queryDB.getTableCheckSum(dbName, _tbl);
        }

        _reqOptions.data.payload = _queryPayload;

        /**
         * 
         * @param {*} res 
         */
        function processResponse(res) {
            for (var _tbl in res.data) {
                resolvePromise(_tbl, res.data[_tbl]);
            }

            var _promise = dbSuccessPromiseObject('onUpdate', '');
            _promise.result.getData = function(key, tblName) {
                if (!key || !tblName) {
                    return null;
                }

                tblName = tblName || tbl;

                return (key && promiseData[tblName][key]) ? promiseData[tblName][key] : [];
            };

            _promise.result.getCheckSum = function(tblName) {
                return promiseData[tblName || tbl].checksum;
            };
            _promise.result.getAllUpdates = function() {
                return promiseData;
            };

            _promise.result.getTable = function(tblName) {
                return promiseData[tblName || tbl];
            };

            _promise.count = function(tblName) {
                var total = 0;
                _def.forEach(function(type) {
                    total += promiseData[tblName || tbl][type].length;
                });

                return total;
            };

            _callback(_promise);
            polling();

        }

        /**
         * perform request
         */
        ajax(_reqOptions)
            .done(processResponse)
            .fail(polling);
    }

    function polling(start) {
        if (destroyed) { return; }

        timerId = setTimeout(function() {
            pollUpdate();
        }, start || ctimer);
    }



    return function(fn, timer, ctype, _payload) {
        if ($isFunction(fn)) {
            _callback = fn;
        }
        //start update
        if ($queryDB.getNetworkResolver('serviceHost', dbName)) {
            ctimer = timer || 1000;
            _def = ctype || _def;
            $payLoad = _payload;
        }

        return ({
            disconnect: function() {
                destroyed = true;
                clearTimeout(timerId);
            },
            withRef: function(allow) {
                withRef = allow;
                return this;
            },
            start: function(start) {
                polling(start);
            }
        });
    };
}