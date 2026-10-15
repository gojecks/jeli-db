/**
 * 
 * @param {*} options 
 */
class RealtimeConnector {
    errorCount = 0;
    emptyResponseCount = 0;
    /**
     * 
     * @param {*} options 
     * @param {*} isExistingMode 
     */
    constructor(options, isExistingMode) {
        this.isExistingDBMode = isExistingMode;
        this.channelsRepository = new Map();
        this.options = Object.assign({
            url: "/database/updates",
            maxErrorCount: 10,
            maximumTrial: 10, // once thredshold is reched we destroy realtime connectivity
            maximumEmptyResponse: 10,
            // maximum default sleep time is set to 1min
            // if counter exceed this time
            // it will reset back to user timer
            // timer must be less than maximumSleepTimer
            maximumSleepTimer: 300000,
            timer: 1000,
            withRef: false,
            payload: null,
            heartBeatEnabled: false,
            socketDomain: null,
            socketRedial: true,
            socketEnabled: false,
            socketTotalRedial: 3, // redial
            socketPingTime: 60000, // 1min of inactivity
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
        this.events = new RealtimeSocketEvent();
        this.destroyed = false;
        this.socketInstance = new SocketService(this);
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

    static createPeer2Peer(options) {
        return new SocketPeer2Peer(options);
    }

    /**
     * 
     * @param {*} context 
     * @returns 
     */
    static getRequestData(context) {
        const request = RealtimeConnector.coreApi.buildHttpRequestOptions(context.dbName, { path: context.options.url });
        const data = this.generatePayload(context);
        Object.assign(request, { data });
        return request;
    }

    /**
     * 
     * @param {*} context 
     * @returns 
     */
    static generatePayload(context) {
        // get payload, payload could be function that contains logic for generation
        let payload = context.options.payload;
        if (typeof payload == 'function') payload = payload();
        const dbName = context.dbName;
        let _queryPayload = {};
        const requestData = {};
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
        for (const ctbl in _queryPayload) {
            let checkSum = { current: null, previous: null };
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
        requestData.syncId = context.options.syncId;
        requestData.socketEnabled = (context.options.socketEnabled && context.options.socketRedial);

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
        if (!records) return;
        let eventData = {};
        const handleDbUpdateData = ctbl => {
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
                    eventData[ctbl] = cdata;
                });
        };

        Promise.all(Object.keys(records).map(handleDbUpdateData)).then(() => {
            this.events.emit('defaults', [new RealTimeEvent(this.options.dbName, this.types, eventData)]);
            eventData = null;
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
        const processResponse = res => {
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
            this.emptyResponseCount = 0;
            this.errorCount = 0;
            this.options.syncId = res.syncId;
            this._handleIncomingData(res.records);
            initiatePolling(res.syncId ? 10 : (ctimer || 60000));
        };


        /**
         * error polling
         */
        const errorPolling = fromError => {
            if (this.errorCount >= this.options.maxErrorCount) {
                this.pausePolling = true;
                console.log('[Realtime] syncing paused due to maximumTrial threshold reached.');
                this.events.emit('paused', {
                    message: 'Maximum trial thredshold reached'
                });

                return;
            }

            if (this.socketConnected) {
                return _pausePolling();
            }

            var timer = this.options.timer;
            if (fromError) {
                this.errorCount++;
            } else {
                this.emptyResponseCount++;
                const timerLesser = (timer < this.options.maximumSleepTimer);
                if (timerLesser && this.emptyResponseCount >= this.options.maximumEmptyResponse) {
                    timer = (this.options.timer * (this.emptyResponseCount - this.options.maximumEmptyResponse));
                    if (timerLesser) {
                        // reset maximum error count
                        this.emptyResponseCount = 0;
                        timer = this.options.maximumSleepTimer;
                    }
                }
            }


            // increment error count
            return initiatePolling(timer);
        };

        const pollCallback = () => {
            // stop action if context is paused and no syncId defined
            if (this.pausePolling && !this.options.syncId) return;
            RealtimeConnector.coreApi.$http(RealtimeConnector.getRequestData(this))
                .then(res => processResponse(res), () => errorPolling(true))
                .catch(() => errorPolling(true));
        };

        // pause all long polling
        const _pausePolling = () => {
            this.pausePolling = true;
            clearTimeout(this.timerId);
        };


        /**
         *
         * @param {*} timer
         * @returns
         */
        const initiatePolling = (timer) => {
            if (this.destroyed) return;
            this.timerId = setTimeout(pollCallback, timer);
        };

        // start the long polling
        initiatePolling();

        // listen to socket events
        this.events.on('socket.connected', () => {
            console.log('socket connected');
            this.socketConnected = true;
            this.channelsRepository.forEach(channel => {
                channel.events.emit({ type: 'connected' });
                // re-join on every (re)connect - idempotent server-side, refreshes the roster
                channel.handler.send('join');
            });
            if (!this.options.syncId)
                _pausePolling()
        })
            .on('socket.disconnected', () => {
                console.log('socket disconnected, starting socket reconnect..');
                this.options.socketRedial = true;
                this.pausePolling = false;
                // disconnect socket for channels
                this.channelsRepository.forEach(function (channel) {
                    channel.events.emit({ type: 'closed' });
                });

                // start a new polling process to request a socket connection
                initiatePolling();
            });
    }


    joinChannel(name, userId) {
        if (!name || !userId) throw new Exception('Name and userId are required to connect to channel');
        if (!this.channelsRepository.has(name)) {
            // channel handler object
            const channel = new SocketChannel(name, {
                send: (type, data = null, ephemeral = false, notify = false) => {
                    const event = { userId, name, type, data };
                    if (ephemeral) event.ephemeral = true;
                    if (notify) event.notify = true;
                    if (this.socketConnected) {
                        this.socketInstance.send('channel', event);
                    } else {
                        // no channel to connect to
                        channel.events.emit({ type: 'error', message: 'No socket connection active' });
                    }
                },
                remove: () => {
                    channel.handler.send('leave');
                    this.channelsRepository.delete(name);
                }
            });

            this.channelsRepository.set(name, channel);
            // send out event
            channel.handler.send('join');
        };

        return this.channelsRepository.get(name);
    }

    getChannel(channelName) {
        return this.channelsRepository.get(channelName);
    }

    /**
     * channelObj = {
     *  channel: "NAME OF CHANNEL (required)",
     *  author: userId,
     *  recipients: [tokenId: "MUST MATCH THE TOKENID of the user(s) you want to commuicate with (userID)"],
     *  data: "this will be sent to recipients, it could contain information about sender"
     * }
     * @param {*} channelObj
     * @returns
     */
    createChannel(channelObj, disableSending) {
        if (!this.channelsRepository.has(channelObj.name)) {
            this.channelsRepository.set(channelObj.name, new SocketChannel(channelObj.name, this));
            if (!disableSending) {
                channelObj.type = 'create';
                this.send('channel', channelObj);
            }
        }

        return this.channelsRepository.get(channelObj.name);
    }
}