/**
 * 
 * @param {*} parentContext
 */
class SocketService {
    constructor(parentContext) {
        if (!(!!WebSocket)) {
            throw new Error('Browser does not support WebSocket, please fallback to Ajax Polling');
        }

        this.destroyed = false;
        this.events = new RealtimeSocketEvent();
        this.pingSent = false;
        this.retryTime = 0;
        this.timerId = null;
        this.parentContext = parentContext;
        this.eventList = ['error', 'open', 'close', 'message'];

        Object.defineProperty(this, 'options', {
            get: function () {
                return parentContext.options;
            }
        });

        /**
         * attach event for disconnect
         */
        parentContext.events.on('disconnected', () => this.disconnect());
        this.connect();
    }
    
    connect() {
        if (this.socket) return;
        /**
         *
         * @param {*} event
         */
        const socketHeartBeat = () => {
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

        const socketEventHandler = (event) => {
            const eventData = JSON.parse(event.data || '["' + event.type + '"]');
            if (eventData && typeof Array.isArray(eventData) && eventData.length) {
                this.events.emit(eventData.shift(), eventData);
                socketHeartBeat();
            }
        };

        this.parentContext.events.on('socket.connect', socketServerEndpoint => {
            if (socketServerEndpoint) {
                console.log('Connecting to socket');
                // construct the domain
                if (!['ws', '//'].includes(socketServerEndpoint.substring(0, 2))) {
                    // wss for secured connections
                    const socketDomain = (this.parentContext.socketDomain || `${location.protocol == 'http' ? 'ws' : 'wss'}://${location.host}`);
                    socketServerEndpoint = `${socketDomain}${socketServerEndpoint}`;
                }
                this.socket = new WebSocket(socketServerEndpoint, this.options.socketSubProtocols);
                // register core events
                for (const eventName of this.eventList) {
                    this.socket.addEventListener(eventName, socketEventHandler, false);
                }
            }
        });

        // register socket event listeners
        this.events
            .on('error', () => {
                console.log('socket connection Error, socket will be disconnected and destroyed.');
                this.disconnect();
            })
            .on('open', () => {
                socketHeartBeat();
                this.parentContext.events.emit('socket.connected');
            })
            .on('close', () => {
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

                // tell the realtime connector socket is disconnected
                this.parentContext.events.emit('socket.disconnected');
            })
            .on('authentication', (authData) => {
                if (!authData.success) {
                    // kill socket process
                    this.disconnect();
                }
            })
            .on('db:update', eventData => {
                this.parentContext._handleIncomingData(eventData);
                socketHeartBeat();
            })
            .on('pong', () => socketHeartBeat())
            .on('channel', (eventData) => {
                const channel = this.parentContext.getChannel(eventData.name);
                if (channel){
                    channel.events.emit(eventData);
                }

                socketHeartBeat();
            });
    }

    disconnect() {
        if (!this.socket) return;
        this.destroyed = true;
        this.socket.close();
        this.socket = null;
        this.events._removeHandlers();
        clearTimeout(this.timerId);
    }

    /**
     *
     * @param {*} event
     * @param {*} data
     */
    send(event, data) {
        if (!this.socket) return;
        this.socket.send(JSON.stringify([event, data]));
    }

    push(data, recipients) {
        this.send('message', {
            recipients: recipients,
            data: data
        });
    }
}






