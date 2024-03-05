function RealtimeEvent() {
    this._eventHandlers = {
        subscribed: [],
        disconnected: []
    };
}
/**
 * 
 * @param {*} eventName 
 * @param {*} callback 
 */
RealtimeEvent.prototype.on = function(eventName, callback) {
    if (!this._eventHandlers.hasOwnProperty(eventName)) {
        this._eventHandlers[eventName] = [];
    }

    this._eventHandlers[eventName].push(callback);

    return this;
};

RealtimeEvent.prototype.off = function(eventName) {
    if (this._eventHandlers.hasOwnProperty(eventName)) {
        this._eventHandlers[eventName].length = 0;
    }
};

RealtimeEvent.prototype.emit = function(eventName, args) {
    var eventCallbacks = this._eventHandlers[eventName] || this._eventHandlers.subscribed;
    for (var callback of eventCallbacks) {
        callback.apply(null, args);
    }
};

RealtimeEvent.prototype.subscribe = function(callback) {
    var index = this._eventHandlers.subscribed.length;
    this._eventHandlers.subscribed.push(callback);
    return () => {
        this._eventHandlers.subscribed.splice(index, 1);
    }
};

RealtimeEvent.prototype._removeHandlers = function(type) {
    Object.keys(this._eventHandlers).forEach((event) => {
        this.off(event);
    });
};