function RealtimeEvent() {
    this._eventHandlers = {};
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
    if (this._eventHandlers.hasOwnProperty(eventName)) {
        this._eventHandlers[eventName].forEach(function(callback) {
            callback.apply(null, args);
        });
    }
};

RealtimeEvent.prototype._removeHandlers = function(type) {
    var _this = this;
    Object.keys(this._eventHandlers).forEach(function(event) {
        _this.off(event);
    });
};