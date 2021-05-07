/**
 * 
 * @param {*} channelName, 
 * @param {*} socketContext 
 */
function SocketChannel(channelName, socketContext) {
    this.channelName = channelName;
    this.socketContext = socketContext;
    this.events = (new RealtimeEvent);
}

/**
 * 
 * @param {*} eventName 
 * @param {*} eventData 
 */
SocketChannel.prototype.send = function(eventData) {
    eventData.name = this.channelName;
    this.socketContext.send('channel', eventData);
};

SocketChannel.prototype.destroy = function(message) {
    this.send({
        type: "unsubscribe",
        message: message
    });

    this.events._removeHandlers();
    this.socketContext.channels.delete(this.channelName);
};

/**
 * 
 * @param {*} recipients 
 * @param {*} data 
 */
SocketChannel.prototype.invite = function(recipients, data) {
    if (isArray(recipients) && recipients.length) {
        this.send({
            type: "invite",
            recipients: recipients,
            data: data
        });
    }
};

SocketChannel.prototype.message = function(data) {
    this.send({
        type: "message",
        data: data
    });
};