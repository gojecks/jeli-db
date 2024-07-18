/**
 * 
 * @param {*} channelName, 
 * @param {*} socketContext 
 */
class SocketChannel {
    constructor(channelName, socketContext) {
        this.channelName = channelName;
        // list of repicients in this channel
        this.recipients = [];
        this.socketContext = socketContext;
        this.events = (new RealtimeEvent);
    }
    /**
     *
     * @param {*} eventName
     * @param {*} eventData
     */
    send(eventData) {
        eventData.name = this.channelName;
        this.socketContext.send('channel', eventData);
    }
    destroy(message) {
        this.send({ type: "unsubscribe", message: message });
        this.events._removeHandlers();
        this.socketContext.channels.delete(this.channelName);
    }
    /**
     *
     * @param {*} recipients
     * @param {*} data
     */
    invite(recipients, data) {
        if (Array.isArray(recipients) && recipients.length) {
            this.send({
                type: "invite",
                recipients: recipients,
                data: data
            });
        }
    }
    push(message) {
        this.send({ message: message, type: "message" });
    }
}




