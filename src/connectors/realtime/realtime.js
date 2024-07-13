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
    this.timerId = null;
    this.pausePolling = true;
    this.types = ["insert", "update", "delete"];
    this.events = new RealtimeEvent();
    this.destroyed = false;
    this.socketInstance = new SocketService(this);
    var onupdateEvent = new OnupdateEventHandler(this.options.dbName, this.types);

    Object.defineProperties(this, {
        ref: {
            get: function () {
                return this.options.type;
            }
        },
        dbName: {
            get: function () {
                return this.options.dbName;
            }
        },
        tbl: {
            get: function () {
                return this.options.tableName;
            }
        },
        onupdateEvent: {
            get: function () {
                return onupdateEvent;
            }
        }
    });
}

RealtimeConnector.prototype.start = function (callback) {
    if (RealtimeConnector.$privateApi.getNetworkResolver('serviceHost', this.dbName)) {
        /**
         * start the polling
         */
        if (callback) this.events.subscribe(callback);
        // enable polling
        this.pausePolling = false;
        this._startPolling(this.options.timer);
    }
};

RealtimeConnector.prototype.disconnect = function () {
    this.destroyed = true;
    clearTimeout(this.timerId);
    this.events.emit('disconnected', [true]);
    this.events._removeHandlers();
};

/**
 * Handle response data sent from realtime polling or socket events
 * @param {*} records 
 */
RealtimeConnector.prototype._handleIncomingData = function(records) {
   this.onupdateEvent.setData(records);
   this.events.emit('defaults', [this.onupdateEvent]);
};

/**
 * 
 * @param {*} context 
 */
RealtimeConnector.prototype._startPolling = function (ctimer) {
    /**
     * 
     * @param {*} res 
     */
    var processResponse = res => {
        /**
         * store our socketServerEndpoint
         * to be used when client creates a socket
         */
        if (res.socketServerEndpoint) {
            this.events.emit('socket.connect', [res.socketServerEndpoint]);
            // disable socketRedial on next request
            this.options.socketRedial = false;
        }

        if (res.type == 'message') {
            return errorPolling(false);
        } else if (res.destroy) {
            return this.disconnect();
        }

        // update promise handler
        this.options.trial = 1;
        this.options.syncId = res.syncId;
        this._handleIncomingData(res.records);
        initiatePolling(res.syncId ? 100 : (ctimer || 60000));
    };


    /**
     * error polling
     */
    var errorPolling = fromError => {
        if (fromError && this.options.trial >= this.options.maximumTrial) {
            this.pausePolling = true;
            console.log('[Realtime] syncing paused due to maximumTrial threshold reached.');
            this.events.emit('paused', {
                message: 'Maximum trial thredshold reached'
            });

            return;
        }
        // increment error count
        this.options.trial++;
        return initiatePolling(getSleepTimer(this.options));
    };

    var pollCallback = () => {
        // stop action if context is paused and no syncId defined
        if (this.pausePolling && !this.options.syncId) return;

        RealtimeConnector.$privateApi.$http(getRequestData(this))
            .then(res => processResponse(res), () => errorPolling(true))
            .catch(() => errorPolling(true));
    };


    /**
     * 
     * @param {*} timer 
     * @returns 
     */
    var initiatePolling = (timer) => {
        if (this.destroyed) return;
        this.timerId = setTimeout(pollCallback, timer);
    };

    // start the long polling
    initiatePolling();

    // listen to socket events
    this.events.on('socket.connected', () => {
        console.log('socket connected');
        this.pausePolling = true;
        clearTimeout(this.timerId);
    })
        .on('socket.disconnected', () => {
            console.log('socket disconnected, starting socket reconnect..');
            this.options.socketRedial = true;
            this.pausePolling = false;
            // start a new polling process to request a socket connection
            initiatePolling();
        })
}

/**
 * 
 * @param {*} options 
 * @param {*} socketMode 
 * @returns RealtimeConnector
 */
RealtimeConnector.createInstance = function (options, socketMode) {
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
    Object.assign(request, { data });
    return request;
}

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
        if (!payload || payload.id) {
            RealtimeConnector.$privateApi.getDbTablesNames(dbName).forEach(function (name) {
                _queryPayload[name] = {};
            });
        } else {
            _queryPayload = payload;
        }
    } else {
        _queryPayload[context.tbl] = {
            query: payload.id ? undefined : payload
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
    // check for server side queryId
    if (payload.id) Object.assign(requestData, payload);
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