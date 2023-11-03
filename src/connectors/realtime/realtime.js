/**
 * 
 * @param {*} options 
 */
function RealtimeConnector(options) {
    this.options = Object.assign({
        url: "/database/updates",
        trial: 1,
        maximumTrial: 10, // once thredshold is reched we destroy realtime connectivity
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

RealtimeConnector.prototype.start = function(callback) {
    if (RealtimeConnector.$privateApi.getNetworkResolver('serviceHost', this.dbName)) {
        /**
         * start the polling
         */
        if (callback) {
            this.events.subscribe(callback);
        }
        startPolling(this);
    }
};

RealtimeConnector.prototype.disconnect = function() {
    this.destroyed = true;
    clearTimeout(this.options.timerId);
    this.events.emit('disconnected', [true]);
    this.events._removeHandlers();
};

/**
 * 
 * @param {*} options 
 * @param {*} socketMode 
 * @returns RealtimeConnector
 */
RealtimeConnector.createInstance = function(options, socketMode) {
    if (socketMode) {
        return new SocketService(options);
    }

    return new RealtimeConnector(options);
};

/**
 * 
 * @param {*} context 
 * @returns 
 */
function getRequestData(context) {
    var request = RealtimeConnector.$privateApi.buildHttpRequestOptions(context.dbName, { path: context.options.url });
    var data = generatePayload(context);
    Object.assign(request, {data});
    return request;
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
    var inc = 1;
    if (options.trial >= options.maximumConcurrentFailure) {
        inc = options.trial;
    }
    return (options.timer * inc);
};

/**
 * 
 * @param {*} context 
 * @returns 
 */
function generatePayload(context) {
    // get payload, payload could be function that contains logic for generation
    var payload = ((typeof context.options.payload == 'function') ? context.options.payload() : context.options.payload);
    var dbName = context.dbName;
    var _queryPayload = {};
    var requestData = {};
    // update type is DB
    if (context.ref == 'db') {
        if (!payload) {
            RealtimeConnector.$privateApi.getDbTablesNames(dbName).forEach(function(name) {
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
        var checkSum = RealtimeConnector.$privateApi.getTableCheckSum(dbName, ctbl);
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
    }

    return requestData;
};

/**
 * 
 * @param {*} context 
 */
function startPolling(context) {
    var ctimer = context.options.timer;

    function pollCallback(syncId) {
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
                // disable socketRedial on next request
                context.options.socketRedial = false;
            }

            if (res.type == 'message') {
                return errorPolling(false);
            } else if (res.destroy) {
                return context.disconnect();
            }

            // update promise handler
            context.options.trial = 1;
            context.options.syncId = res.syncId;
            updatePromiserHandler(context, res.records);
            intiatePolling(res.syncId ? 100 : ctimer);
        }

        /**
         * error polling
         */
        function errorPolling(fromError) {
            if (fromError && context.options.trial >= context.options.maximumTrial){
                context.paused = true;
                console.log('[Realtime] syncing paused due to maximumTrial threshold reached.');
                context.events.emit('paused', {
                    message: 'Maximum trial thredshold reached'
                });

                return;
            }
            // increment error count
            context.options.trial++;
            return intiatePolling(getSleepTimer(context.options));
        }

        /**
         * perform request
         */
        RealtimeConnector.$privateApi.$http(getRequestData(context))
            .then(processResponse, () => errorPolling(true))
            .catch(() => errorPolling(true));
    }


    /**
     * 
     * @param {*} timer 
     * @returns 
     */
    function intiatePolling(timer) {
        if (context.destroyed) return;
        context.options.timerId = setTimeout(pollCallback, timer);
    }

    // start the long polling
    intiatePolling();
}