/**
 * 
 * @param {*} parentContext
 */
function SocketService(parentContext) {
    if (!(!!WebSocket)) {
        throw new Error('Browser does not support WebSocket, please fallback to Ajax Polling');
    }
    this.channelsRepository = new Map();
    this.destroyed = false;
    this.events = new RealtimeEvent();
    this.pingSent = false;
    this.retryTime = 0;
    this.timerId = null;
    this.parentContext = parentContext;

    Object.defineProperty(this, 'options', {
        get: function() {
            return parentContext.options
        }
    });

    /**
     * attach event for disconnect
     */
    parentContext.events.on('disconnected', () => {
        this.disconnect();
    });
}

SocketService.prototype.connect = function() {
    if (this.socket) return;
    var _this = this;
    var eventList = ['error', 'open', 'close', 'message'];

    /**
     * 
     * @param {*} response 
     */
    function createAndConnectSocket(socketServerEndpoint) {
        if (socketServerEndpoint) {
            console.log('Connecting to socket');
            _this.socket = new WebSocket(socketServerEndpoint, _this.options.socketSubProtocols);
            // register core events
            for (var eventName of eventList) {
                _this.socket.addEventListener(eventName, socketEventHandler, false);
            }
        }
    }

    function onClosedConnection() {
        // User closed the connection
        if (_this.destroyed) return;
        /**
         * Attempt to reconnect to  server
         */
        clearTimeout(_this.timerId);
        console.log('connection closed.');
        eventList.forEach(function(eventName) {
            _this.socket.removeEventListener(eventName, socketEventHandler, false);
        });
        // clear socketServerEndpoint
        _this.options.socketRedial = true;
        console.log('reconnecting socket..');
    }

    function onErrorConnection() {
        console.log('socket connection Error, socket will be disconnected and destroyed.');
        _this.disconnect();
    }

    function socketHeartBeat() {
        clearTimeout(_this.timerId);
        _this.pingSent = !_this.pingSent;
        _this.retryTime = 0;
        _this.timerId = setTimeout(function() {
            if (_this.socket.readyState === _this.socket.OPEN) {
                _this.send("ping", +new Date);
            }
        }, _this.options.socketPingTime);
    }

    /**
     * 
     * @param {*} eventData 
     */
    function onSocketDataReceived(eventData) {
        updatePromiserHandler(_this.parentContext, eventData);
        socketHeartBeat();
    }

    /**
     * 
     * @param {*} event
     */
    function socketEventHandler(event) {
        var eventData = JSON.parse(event.data || '["' + event.type + '"]');
        if (eventData && typeof Array.isArray(eventData) && eventData.length) {
            _this.events.emit(eventData.shift(), eventData);
            socketHeartBeat();
        }
    }

    /**
     * 
     * @param {*} eventData 
     * @param {*} socket 
     */
    function onChannelEventReceived(eventData) {
        var channel = _this.createChannel(eventData, true);
        channel.events.emit(eventData.type, [eventData]);
        socketHeartBeat();
    }

    this.parentContext.events.on('socket.connect', function(socketServerEndpoint) {
        createAndConnectSocket(socketServerEndpoint);
    });

    // register socket event listeners
    this.events
        .on('error', onErrorConnection)
        .on('open', function() {
            console.log('socket connected');
            socketHeartBeat();
        })
        .on('close', onClosedConnection)
        .on('authentication', function(authData) {
            if (!authData.success) {
                // kill socket process
                _this.disconnect();
            }
        })
        .on('db:update', onSocketDataReceived)
        .on('pong', socketHeartBeat)
        .on('channel', onChannelEventReceived);
}

SocketService.prototype.disconnect = function() {
    if (!this.socket) return;
    this.destroyed = true;
    this.socket.close();
    this.socket = null;
    this.events._removeHandlers();
    clearTimeout(this.timerId);
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
    if (!this.channelsRepository.has(channelObj.channel)) {
        this.channelsRepository.set(channelObj.channel, new SocketChannel(channelObj.channel, this));
        if (!disableSending)
            this.send('createchannel', channelObj);
    }

    return this.channelsRepository.get(channelObj.channel);
};

SocketService.prototype.getChannel = function(channelName) {
    return this.channelsRepository.get(channelName);
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

SocketService.prototype.push = function(data, recipients) {
    this.send('message', {
        recipients: recipients,
        data: data
    });
}