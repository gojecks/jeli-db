/**
 * 
 * @param {*} options 
 */
function SocketService(options) {
    if (!(!!WebSocket)) {
        throw new Error('Browser does not support WebSocket, please fallback to Ajax Polling');
    }

    RealtimeAbstract.call(this, options);
    this.socketToken = null;
    this.channels = new Map();
}

SocketService.prototype = Object.create(RealtimeAbstract.prototype);
SocketService.prototype.constructor = RealtimeAbstract;
SocketService.prototype.start = function(callback) {
    var socket = null;
    if (socket) return;
    var _this = this;
    var retryTime = 0;
    var pingSent = false;
    /**
     * 
     * @param {*} response 
     */
    function _connectSocket(socketServerEndpoint) {
        if (socketServerEndpoint) {
            socket = new WebSocket(socketServerEndpoint, _this.options.socketSubProtocols);
            _this.events
                .on('error', onErrorConnection)
                .on('open', socketHeartBeat)
                .on('close', onClosedConnection)
                .on('authentication', function(authData) {
                    if (!authData.success) {
                        // kill socket process
                        _this.disconnect();
                    }
                })
                .on('data', onDatabaseEventReceived)
                .on('pong', socketHeartBeat)
                .on('channel', onChannelEventReceived);

            // register core events
            ['error', 'open', 'close', 'message'].forEach(RegisterSocketEvents);
        }
    }

    function onClosedConnection() {
        // User closed the connection
        if (_this.destroyed) return;
        /**
         * Attempt to reconnect to  server
         */
        setTimeout(function() {
            console.log('reconnecting socket..');
            _startConnectivity();
        }, _this.options.socketReconnectTime);
    }

    function onErrorConnection() {
        console.log('socket connection Error, socket will be disconnected and destroyed.');
        _this.disconnect();
    }

    function socketHeartBeat() {
        clearTimeout(_this.options.timerId);
        pingSent = !pingSent;
        _this.options.timerId = setTimeout(function() {
            if (socket.readyState === socket.OPEN) {
                _this.send("ping", +new Date);
            }
        }, _this.options.socketPingTime);
    }

    /**
     * 
     * @param {*} eventData 
     */
    function onDatabaseEventReceived(eventData) {
        if ($isEqual(eventData.type, 'report')) {
            startChunkState(_this, eventData, function() {});
        } else if ($isEqual(eventData.type, 'message')) {
            return;
        }

        updatePromiserHandler(_this, eventData);
    }

    /**
     * 
     * @param {*} eventName 
     */
    function RegisterSocketEvents(eventName) {
        socket.addEventListener(eventName, function(event) {
            var eventData = JSON.parse(event.data || '["' + event.type + '"]');
            if (eventData && typeof eventData === 'object') {
                eventData.push(socket);
                _this.events.emit(eventData.shift(), eventData);
            }
        });
    }

    /**
     * 
     * @param {*} eventData 
     * @param {*} socket 
     */
    function onChannelEventReceived(eventData, socket) {
        var channel = _this.createChannel(eventData, true);
        channel.events.emit(eventData.type, [eventData, socket]);
    }


    function _startConnectivity() {
        if (retryTime === _this.options.socketTotalRedial) {
            throw new Error('Unable to connect to socket server, please try again');
        }

        _this.pollRequest(null, true)
            .then(function(res) {
                _connectSocket(res.socketServerEndpoint);
                retryTime = 0;
            }, function() {
                setTimeout(_startConnectivity, _this.options.socketReconnectTime);
            });
        retryTime++;
    }

    Object.defineProperty(this, 'socket', {
        get: function() {
            return socket
        }
    });

    this.callback = callback;
    _startConnectivity();
}

SocketService.prototype.disconnect = function() {
    if (!this.socket) return;
    this.destroyed = true;
    clearTimeout(this.options.timerId);
    this.socket.close();
    this.events._removeHandlers();
};

/**
 * channelObj = {
 *  channel: "NAME OF CHANNEL (required)",
 *  recipients: [tokenId: "MUST MATCH THE TOKENID of the user(s) you want to commuicate with (userID)"],
 *  data: "this will be sent to recipients, it could contain information about sender"
 * }
 * @param {*} channelObj 
 * @returns 
 */
SocketService.prototype.createChannel = function(channelObj, disableSending) {
    if (!this.channels.has(channelObj.channel)) {
        this.channels.set(channelObj.channel, new SocketChannel(channelObj.channel, this));
        if (!disableSending)
            this.send('createchannel', channelObj);
    }

    return this.channels.get(channelObj.channel);
};

SocketService.prototype.getChannel = function(channelName) {
    return this.channels.get(channelName);
};

/**
 * 
 * @param {*} event 
 * @param {*} data 
 */
SocketService.prototype.send = function(event, data) {
    if (!this.socket) return;
    this.socket.send(JSON.stringify([event, data]));
}