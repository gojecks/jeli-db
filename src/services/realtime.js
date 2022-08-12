/**
 * 
 * @param {*} options 
 */
function RealtimeAbstract(options) {
    this.options = Object.assign({
        url: "/database/updates",
        trial: 1,
        maximumConcurrentFailure: 3,
        timer: 1000,
        withRef: false,
        timerId: null,
        payload: null,
        heartBeatEnabled: false,
        socketRedial: true,
        socketEnabled: false,
        socketTotalRedial: 3, // redial
        socketPingTime: 300000, // 5min of inactivity
        socketReconnectTime: 3000, // 3 seconds,
        socketSubProtocols: ['json']
    }, options || {});

    /**
     * private properties
     */
    this.types = ["insert", "update", "delete"];
    this.events = new RealtimeEvent();
    this.destroyed = false;
    this.socketInstance = new SocketService(this);
    var onupdateEvent = new OnupdateEventHandler(this.options.dbName, this.types);

    Object.defineProperties(this, {
        ref: {
            get: function() {
                return this.options.type;
            }
        },
        dbName: {
            get: function() {
                return this.options.dbName;
            }
        },
        tbl: {
            get: function() {
                return this.options.tableName;
            }
        },
        onupdateEvent: {
            get: function() {
                return onupdateEvent;
            }
        }
    });
}

RealtimeAbstract.prototype.start = function(callback) {
    if (privateApi.getNetworkResolver('serviceHost', this.dbName)) {
        /**
         * start the polling
         */
        if (callback) {
            this.events.subscribe(callback);
        }
        startPolling(this);
    }
};

RealtimeAbstract.prototype.disconnect = function() {
    this.destroyed = true;
    clearTimeout(this.options.timerId);
    this.events.emit('disconnected', [true]);
    this.events._removeHandlers();
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

    return new RealtimeAbstract(options);
};

/**
 * 
 * @param {*} context 
 * @returns 
 */
function getRequestData(context) {
    var requestData = privateApi.buildHttpRequestOptions(context.dbName, { path: context.options.url });
    var requestPayload = generatePayload(context);
    Object.assign(requestData.data, requestPayload);
    return requestData;
}


/**
 * 
 * @param {*} context 
 * @param {*} records 
 */
function updatePromiserHandler(context, records) {
    /**
     * 
     * @param {*} _tbl 
     */
    context.onupdateEvent.setData(records);
    context.events.emit('defaults', [context.onupdateEvent]);
};

/**
 * 
 * @returns Number
 */
function getSleepTimer(options) {
    if (options.trial >= options.maximumConcurrentFailure) {
        options.trial *= options.maximumConcurrentFailure;
    }
    return (options.timer * options.trial);
};

/**
 * 
 * @param {*} context 
 * @returns 
 */
function generatePayload(context) {
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
        var checkSum = privateApi.getTableCheckSum(dbName, ctbl);
        if (!checkSum.current) {
            checkSum.previous = "";
        }

        _queryPayload[ctbl].checksum = checkSum;
    }

    Object.keys(_queryPayload).forEach(writeCheckSumAndSyncId);
    requestData.payload = _queryPayload;
    requestData.ref = context.ref;
    requestData.type = context.types;
    if (context.options.syncId) {
        requestData.syncId = context.options.syncId;
    }

    if (context.options.socketEnabled && context.options.socketRedial) {
        console.log('socketServerEndpoint requested')
        requestData.socketEnabled = true;
        context.options.socketRedial = false;
    }

    return requestData;
};

/**
 * 
 * @param {*} context 
 */
function startPolling(context) {
    var ctimer = context.options.timer;

    function pollUpdate(syncId) {
        /**
         * 
         * @param {*} res 
         */
        function processResponse(res) {
            /**
             * store our socketServerEndpoint
             * to be used when client creates a socket
             */
            if (res.socketServerEndpoint) {
                context.events.emit('socket.connect', [res.socketServerEndpoint]);
            }

            if ($isEqual(res.type, 'message')) {
                return errorPolling();
            } else if (res.destroy) {
                return context.disconnect();
            }

            // update promise handler
            context.options.trial = 1;
            context.options.syncId = res.syncId;
            updatePromiserHandler(context, res.records);
            _polling(res.syncId ? 100 : ctimer);
        }

        /**
         * error polling
         */
        function errorPolling() {
            return _polling(getSleepTimer(context.options));
        }

        /**
         * perform request
         */
        privateApi.$http(getRequestData(context))
            .then(processResponse, errorPolling)
            .catch(errorPolling);
    }


    /**
     * 
     * @param {*} timer 
     * @returns 
     */
    function _polling(timer) {
        if (context.destroyed) return;
        context.options.timerId = setTimeout(pollUpdate, timer);
    }

    // start the long polling
    _polling();
}