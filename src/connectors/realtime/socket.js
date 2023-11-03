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
    this.eventList = ['error', 'open', 'close', 'message'];

    Object.defineProperty(this, 'options', {
        get: function () {
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

SocketService.prototype.connect = function () {
    if (this.socket) return;
    var _this = this;
    
    this.parentContext.events.on('socket.connect', socketServerEndpoint => {
        if (socketServerEndpoint) {
            console.log('Connecting to socket');
            this.socket = new WebSocket(socketServerEndpoint, this.options.socketSubProtocols);
            // register core events
            for (var eventName of this.eventList) {
                this.socket.addEventListener(eventName, socketEventHandler, false);
            }
        }
    });

    var onClosedConnection = () => {
        // User closed the connection
        if (this.destroyed) return;
        /**
         * Attempt to reconnect to  server
         */
        clearTimeout(this.timerId);
        console.log('connection closed.');
        this.eventList.forEach(eventName => {
            this.socket.removeEventListener(eventName, socketEventHandler, false);
        });
        // clear socketServerEndpoint
        this.options.socketRedial = true;
        console.log('reconnecting socket..');
    };

    var socketHeartBeat = () => {
        if (!this.socket) return;
        clearTimeout(this.timerId);
        this.pingSent = !this.pingSent;
        this.retryTime = 0;
        this.timerId = setTimeout(() => {
            if (this.socket.readyState === this.socket.OPEN) {
                this.send('ping', +new Date);
            }
        }, this.options.socketPingTime);
    };


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

    // register socket event listeners
    this.events
        .on('error', () => {
            console.log('socket connection Error, socket will be disconnected and destroyed.');
            this.disconnect();
        })
        .on('open', () => {
            console.log('socket connected');
            socketHeartBeat();
        })
        .on('close', () => onClosedConnection())
        .on('authentication', (authData) => {
            if (!authData.success) {
                // kill socket process
                this.disconnect();
            }
        })
        .on('db:update', (eventData) => {
            updatePromiserHandler(this.parentContext, eventData);
            socketHeartBeat();
        })
        .on('pong', () => socketHeartBeat())
        .on('channel', (eventData) => {
            var channel = this.createChannel(eventData, true);
            channel.events.emit(eventData.type, [eventData]);
            socketHeartBeat();
        });
}

SocketService.prototype.disconnect = function () {
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
SocketService.prototype.createChannel = function (channelObj, disableSending) {
    if (!this.channelsRepository.has(channelObj.channel)) {
        this.channelsRepository.set(channelObj.channel, new SocketChannel(channelObj.channel, this));
        if (!disableSending)
            this.send('createchannel', channelObj);
    }

    return this.channelsRepository.get(channelObj.channel);
};

SocketService.prototype.getChannel = function (channelName) {
    return this.channelsRepository.get(channelName);
};

/**
 * 
 * @param {*} event 
 * @param {*} data 
 */
SocketService.prototype.send = function (event, data) {
    if (!this.socket) return;
    this.socket.send(JSON.stringify([event, data]));
}

SocketService.prototype.push = function (data, recipients) {
    this.send('message', {
        recipients: recipients,
        data: data
    });
}