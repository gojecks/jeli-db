/**
 * 
 * @param {*} options 
 */
class RealtimeConnector {
    /**
     * 
     * @param {*} options 
     * @param {*} isExistingMode 
     */
    constructor(options, isExistingMode) {
        this.isExistingDBMode = isExistingMode;
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
        this.socketConnected = false;
        this.pausePolling = true;
        this.types = ["insert", "update", "delete"];
        this.events = new RealtimeEvent();
        this.destroyed = false;
        this.socketInstance = new SocketService(this);
        this.onupdateEvent = new OnupdateEventHandler(this.options.dbName, this.types);
    }
    /**
     *
     * @param {*} options
     * @param {*} socketMode
     * @returns RealtimeConnector
     */
    static createInstance(options, socketMode) {
        if (socketMode) {
            return new SocketService(options);
        }

        return new RealtimeConnector(options);
    }

    /**
     * 
     * @param {*} context 
     * @returns 
     */
    static getRequestData(context) {
        var request = RealtimeConnector.coreApi.buildHttpRequestOptions(context.dbName, { path: context.options.url });
        var data = this.generatePayload(context);
        Object.assign(request, { data });
        return request;
    }

    /**
     * 
     * @returns Number
     */
    static getSleepTimer(options) {
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
    static generatePayload(context) {
        // get payload, payload could be function that contains logic for generation
        var payload = context.options.payload;
        if (typeof payload == 'function') payload = payload();
        var dbName = context.dbName;
        var _queryPayload = {};
        var requestData = {};
        // update type is DB
        if (context.ref == 'db') {
            if (!payload || payload.id) {
                _queryPayload = RealtimeConnector.coreApi.getDBTableNames(dbName, true)
                    .reduce((accum, name) => (accum[name] = {}, accum), {});
            } else {
                _queryPayload = payload;
            }
        } else {
            _queryPayload[context.tbl] = {
                query: payload.id ? undefined : payload
            };
        }

        // attach checksum only when existingDBMode
        for (var ctbl in _queryPayload) {
            var checkSum = { current: null, previous: null };
            if (context.isExistingDBMode) {
                checkSum = RealtimeConnector.coreApi.getTableCheckSum(dbName, ctbl);
                if (!checkSum.current) checkSum.previous = "";
            }

            _queryPayload[ctbl].checksum = checkSum;
        }
        // set existing mode to true so that we can capture checksum for next request
        context.isExistingDBMode = true;


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

    get ref() {
        return this.options.type;
    }

    get dbName() {
        return this.options.dbName;
    }

    get tbl() {
        return this.options.tableName;
    }

    start(callback) {
        if (RealtimeConnector.coreApi.getConfigData('serviceHost', this.dbName)) {
            /**
             * start the polling
             */
            if (callback) this.events.subscribe(callback);
            // enable polling
            this.pausePolling = false;
            this._startPolling(this.options.timer);
        }
    }
    disconnect() {
        this.destroyed = true;
        clearTimeout(this.timerId);
        this.events.emit('disconnected', [true]);
        this.events._removeHandlers();
    }
    /**
     * Handle response data sent from realtime polling or socket events
     * @param {*} records
     */
    _handleIncomingData(records) {
        var handleDbUpdateData = ctbl => {
            var data = records[ctbl];
            RealtimeConnector.coreApi
                .resolveUpdate(this.dbName, ctbl, data, false)
                .then((cdata) => {
                    RealtimeConnector.coreApi
                        .updateDB(this.dbName, ctbl, table => {
                            if (data.checksum) {
                                table._previousHash = data.previousHash;
                                table._hash = data.checksum;
                            }
                        });
                    // set the record
                    this.onupdateEvent.setData(ctbl, cdata);
                });
        };

        Promise.all(Object.keys(records).map(handleDbUpdateData)).then(() => {
            this.events.emit('defaults', [this.onupdateEvent]);
        });
    }
    /**
     *
     * @param {*} context
     */
    _startPolling(ctimer) {
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

            if (res.type == 'message')
                return errorPolling(false);
            else if (res.destroy)
                return this.disconnect();

            // update promise handler
            this.options.trial = 1;
            this.options.syncId = res.syncId;
            this._handleIncomingData(res.records);
            initiatePolling(res.syncId ? 10 : (ctimer || 60000));
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

            if (this.socketConnected)
                return _pausePolling();

            // increment error count
            this.options.trial++;
            return initiatePolling(RealtimeConnector.getSleepTimer(this.options));
        };

        var pollCallback = () => {
            // stop action if context is paused and no syncId defined
            if (this.pausePolling && !this.options.syncId) return;
            RealtimeConnector.coreApi.$http(RealtimeConnector.getRequestData(this))
                .then(res => processResponse(res), () => errorPolling(true))
                .catch(() => errorPolling(true));
        };

        // pause all long polling
        var _pausePolling = () => {
            this.pausePolling = true;
            clearTimeout(this.timerId);
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
            this.socketConnected = true;
            if (!this.options.syncId)
                _pausePolling()
        })
            .on('socket.disconnected', () => {
                console.log('socket disconnected, starting socket reconnect..');
                this.options.socketRedial = true;
                this.pausePolling = false;
                // start a new polling process to request a socket connection
                initiatePolling();
            });
    }
}