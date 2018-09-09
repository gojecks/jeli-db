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

    /**
     * 
     * @param {*} _payload 
     * @param {*} syncId 
     */
    function generatePayload(_payload, syncId) {
        var _reqOptions = $queryDB.buildOptions(dbName, null, "/recent/updates");
        _reqOptions.data.ref = type;
        _reqOptions.data.type = _def,
            _queryPayload = {};
        if (tbl) {
            _queryPayload[tbl] = {
                query: $isFunction(_payload) ? _payload() : _payload
            };
        }

        if ($isEqual(type, 'db')) {
            if (!_payload) {
                $queryDB.getDbTablesNames(dbName).forEach(function(name) {
                    _queryPayload[name] = {};
                });
            } else {
                _queryPayload = ($isFunction(_payload)) ? _payload() : _payload;
            }
        }

        for (var _tbl in _queryPayload) {
            _queryPayload[_tbl].checksum = $queryDB.getTableCheckSum(dbName, _tbl);
            if (syncId) {
                _queryPayload[_tbl].syncId = syncId;
            }
        }

        _reqOptions.data.payload = _queryPayload;

        return _reqOptions;
    }

    /**
     * 
     * @param {*} report 
     */
    function startChunkState(report) {
        var totalRecordsToSync = report.total;

        function chunkRequest() {
            pollRequest(generatePayload($payLoad, report.syncId))
                .then(function(res) {
                    totalRecordsToSync -= report.total_per_request;
                    updatePromiserHandler(res);
                    if (totalRecordsToSync > 0) {
                        chunkRequest();
                    } else {
                        polling();
                    }
                }, function() {
                    setTimeout(chunkRequest, 5000);
                });
        }

        chunkRequest();
    }

    function updatePromiserHandler(res) {
        var promiseData = {};
        /**
         * 
         * @param {*} _tbl 
         * @param {*} _data 
         */
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
    }



    function pollUpdate() {
        /**
         * 
         * @param {*} res 
         */
        function processResponse(res) {
            if ($isEqual(res.type, 'report')) {
                return startChunkState(res);
            }
            updatePromiserHandler(res);
            polling(ctimer);
        }

        /**
         * perform request
         */
        pollRequest(generatePayload($payLoad))
            .then(processResponse, function() {
                polling(ctimer);
            });
    }

    /**
     * 
     * @param {*} _reqOptions 
     */
    function pollRequest(_reqOptions) {
        return ajax(_reqOptions);
    }

    /**
     * 
     * @param {*} start 
     */
    function polling(start) {
        if (destroyed) { return; }
        timerId = setTimeout(function() {
            pollUpdate();
        }, start);
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
            start: polling
        });
    };
}