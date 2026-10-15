/**
 * 
 * @param {*} channelName, 
 * @param {*} socketContext 
 */
class SocketChannel {
    constructor(channelName, handler) {
        this.channelName = channelName;
        // list of repicients in this channel
        this.recipients = [];
        this.handler = handler;
        this.events = new Subscription();
    }
    /**
     *
     * @param {*} eventName
     * @param {*} eventData
     * @param {*} ephemeral - skip the server's durable retry-on-reconnect queue (presence/cursor-style data)
     * @param {*} notify - server-side flag read at the top level of the wire event, not off eventData (see unsubscribe/leave)
     */
    send(eventData, type = 'message', ephemeral = false, notify = false) {
        this.handler.send(type, eventData, ephemeral, notify);
    }

    // notify defaults true - the server stays silent about a leave unless this is set
    destroy(message, notify = true) {
        this.send({ message }, 'unsubscribe', false, notify)
        this.handler.remove();
    }
    /**
     *
     * @param {*} recipients
     * @param {*} data
     */
    invite(recipients, message) {
        if (Array.isArray(recipients) && recipients.length) {
            this.send({
                recipients: recipients,
                nessage
            }, 'invite');
        }
    }

    push(message, ephemeral = false) {
        this.send({ message }, 'message', ephemeral);
    }
}




