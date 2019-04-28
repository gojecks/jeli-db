/**
 * 
 * @param {*} type 
 * @param {*} dbName 
 * @param {*} tbl 
 * @param {*}  
 */
function ApplicationRealtime(type, dbName, tbl, $hash) {
    var timerId,
        _this = this;
    /**
     * private properties
     */
    this.callback = function() {};
    this.timer = 1000;
    this.payload = null;
    this.types = ["insert", "update", "delete"];
    this.destroyed = false;
    this.withRef = false;
    this.trial = 1;
    this.url = "/database/updates";

    Object.defineProperties(this, {
        ref: {
            get: function() {
                return type;
            }
        },
        dbName: {
            get: function() {
                return dbName;
            }
        },
        tbl: {
            get: function() {
                return tbl;
            }
        }
    });

    var onupdateEvent = new OnupdateEventHandler(tbl);
    /**
     * Attach types property to the event
     */
    Object.defineProperty(onupdateEvent, 'types', {
        get: function() {
            return _this.types;
        }
    });

    function getSleepTimer() {
        return (_this.timer * _this.trial++);
    }

    /**
     * 
     * @param {*} report 
     */
    function startChunkState(report) {
        var totalRecordsToSync = report.total;

        function chunkRequest() {
            pollRequest(_this.generatePayload(report.syncId))
                .then(function(res) {
                    totalRecordsToSync -= report.total_per_request;
                    updatePromiserHandler(res);
                    _this.trial = 0;
                    if (totalRecordsToSync > 0) {
                        chunkRequest();
                    } else {
                        polling(_this.timer);
                    }
                }, function() {
                    setTimeout(chunkRequest, getSleepTimer());
                });
        }

        chunkRequest();
    }

    function updatePromiserHandler(res) {
        /**
         * 
         * @param {*} _tbl 
         */
        function resolvePromise(ctbl) {
            var _data = res[ctbl];
            privateApi
                .$resolveUpdate(dbName, ctbl, _data, _this.withRef)
                .then(function(cdata) {
                    privateApi
                        .$taskPerformer
                        .updateDB(dbName, ctbl, function(table) {
                            if (_data.checksum) {
                                table._previousHash = _data.previousHash;
                                table._hash = _data.checksum;
                            }
                        });

                    onupdateEvent.setData(ctbl, cdata);
                });
        }

        // get response keys and evaluate the response
        Object.keys(res).forEach(resolvePromise);
        _this.callback(onupdateEvent);
    }

    function pollUpdate() {
        var timer = _this.timer;
        /**
         * 
         * @param {*} res 
         */
        function processResponse(res) {
            if ($isEqual(res.type, 'report')) {
                return startChunkState(res);
            } else if ($isEqual(res.type, 'message')) {
                return errorPolling();
            }

            if (res.destroy) {
                destroyed = true;
                return;
            }

            // update promise handler
            _this.trial = 1;
            updatePromiserHandler(res);
            polling(timer);
        }

        /**
         * error polling
         */
        function errorPolling() {
            return polling(getSleepTimer());
        }

        /**
         * perform request
         */
        pollRequest(_this.generatePayload())
            .then(processResponse, function(res) {
                if (!$isEqual(res.statusCode, 401)) {
                    errorPolling();
                }
            });
    }

    /**
     * 
     * @param {*} _reqOptions 
     */
    function pollRequest(_reqOptions) {
        return privateApi.$http(_reqOptions);
    }

    /**
     * 
     * @param {*} start 
     */
    function polling(start) {
        if (_this.destroyed) { return; }
        timerId = setTimeout(pollUpdate, start);
    }

    this.start = function() {
        if (privateApi.getNetworkResolver('serviceHost', dbName)) {
            polling();
        }
    };

    this.disconnect = function() {
        this.destroyed = true;
        clearTimeout(timerId);
    };

    this.once = function() {
        this.start();
        this.destroyed = true;
    };
}

/**
 * 
 * @param {*} syncId 
 */
ApplicationRealtime.prototype.generatePayload = function(syncId) {
    var payload = ($isFunction(this.payload) ? this.payload() : this.payload);
    var dbName = this.dbName;
    var _reqOptions = privateApi.buildOptions(this.dbName, null, this.url),
        _queryPayload = {};
    // update type is DB
    if ($isEqual(this.ref, 'db')) {
        if (!payload) {
            privateApi.getDbTablesNames(this.dbName).forEach(function(name) {
                _queryPayload[name] = {};
            });
        } else {
            _queryPayload = payload;
        }
    } else {
        _queryPayload[this.tbl] = {
            query: payload
        };
    }
    /**
     * 
     * @param {*} ctbl 
     */
    function writeCheckSumAndSyncId(ctbl) {
        _queryPayload[ctbl].checksum = privateApi.getTableCheckSum(dbName, ctbl);
        if (syncId) {
            _queryPayload[ctbl].syncId = syncId;
        }
    }

    Object.keys(_queryPayload).forEach(writeCheckSumAndSyncId);
    _reqOptions.data.payload = _queryPayload;
    _reqOptions.data.ref = this.ref;
    _reqOptions.data.type = this.types;

    return _reqOptions;
}