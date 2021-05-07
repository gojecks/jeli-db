/**
 * 
 * @param {*} options 
 */
function RealtimeAbstract(options) {
    this.options = {
        url: "/database/updates",
        trial: 1,
        timer: 1000,
        withRef: false,
        timerId: null,
        payload: null,
        socketTotalRedial: 3,
        socketPingTime: 30000, // 30 seconds
        socketReconnectTime: 3000, // 3 seconds,
        socketSubProtocols: ['json']
    };
    /**
     * private properties
     */
    this.types = ["insert", "update", "delete"];
    this.destroyed = false;
    this.callback = function() {};
    this.events = new RealtimeEvent();
    var onupdateEvent = new OnupdateEventHandler(options.tableName, this.types);

    Object.defineProperties(this, {
        ref: {
            get: function() {
                return options.type;
            }
        },
        dbName: {
            get: function() {
                return options.dbName;
            }
        },
        tbl: {
            get: function() {
                return options.tableName;
            }
        },
        onupdateEvent: {
            get: function() {
                return onupdateEvent;
            }
        }
    });
}

/**
 * 
 * @param {*} context 
 * @param {*} syncId 
 * @param {*} socketEnabled 
 * @returns 
 */
function getRequestData(context, syncId, socketEnabled) {
    var requestData = privateApi.buildOptions(context.dbName, null, context.options.url);
    var requestPayload = generatePayload(context, syncId);
    requestPayload.socketEnabled = socketEnabled;
    Object.assign(requestData.data, requestPayload);
    return requestData;
}


RealtimeAbstract.prototype.once = function() {
    this.start();
    this.destroyed = true;
};

RealtimeAbstract.prototype.disconnect = function() {};

RealtimeAbstract.prototype.extendOptions = function(options) {
    Object.assign(this.options, options);
};

/**
 * 
 * @param {*} syncId 
 */
RealtimeAbstract.prototype.pollRequest = function(syncId, socketEnabled) {
    return privateApi.$http(getRequestData(this, syncId, socketEnabled));
};

/**
 * 
 * @param {*} options 
 * @param {*} socketMode 
 * @returns RealtimeAbstract
 */
RealtimeAbstract.createInstance = function(options, socketMode) {
    if (socketMode) {
        return new SocketService(options);
    }

    return new AjaxPollingService(options);
};

/**
 * 
 * @param {*} res 
 */
function updatePromiserHandler(context, res) {
    /**
     * 
     * @param {*} _tbl 
     */
    var onupdateEvent = context.onupdateEvent;

    function resolvePromise(ctbl) {
        var _data = res[ctbl];
        privateApi
            .$resolveUpdate(context.dbName, ctbl, _data, context.withRef)
            .then(function(cdata) {
                privateApi
                    .$taskPerformer
                    .updateDB(context.dbName, ctbl, function(table) {
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
    context.callback(onupdateEvent);
};

/**
 * 
 * @param {*} context 
 * @param {*} report 
 * @param {*} resumeCallback 
 */
function startChunkState(context, report, resumeCallback) {
    var totalRecordsToSync = report.total;

    function chunkRequest() {
        context.pollRequest(syncId)
            .then(function(res) {
                totalRecordsToSync -= report.total_per_request;
                updatePromiserHandler(context, res);
                context.options.trial = 0;
                if (totalRecordsToSync > 0) {
                    chunkRequest();
                } else {
                    resumeCallback();
                }
            }, function() {
                setTimeout(chunkRequest, getSleepTimer(context.options));
            });
    }

    chunkRequest();
};

/**
 * 
 * @returns Number
 */
function getSleepTimer(options) {
    return (options.timer * options.trial++);
};

/**
 * 
 * @param {*} context 
 * @param {*} syncId 
 * @returns 
 */
function generatePayload(context, syncId) {
    var payload = ($isFunction(context.options.payload) ? context.options.payload() : context.options.payload);
    var dbName = context.dbName;
    var _queryPayload = {};
    var requestData = {};
    // update type is DB
    if ($isEqual(context.ref, 'db')) {
        if (!payload) {
            privateApi.getDbTablesNames(dbName).forEach(function(name) {
                _queryPayload[name] = {};
            });
        } else {
            _queryPayload = payload;
        }
    } else {
        _queryPayload[context.tbl] = {
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
    requestData.payload = _queryPayload;
    requestData.ref = context.ref;
    requestData.type = context.types;

    return requestData;
};