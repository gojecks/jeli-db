class RealtimeEvent {
    constructor() {
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
    on(eventName, callback) {
        if (!this._eventHandlers.hasOwnProperty(eventName)) {
            this._eventHandlers[eventName] = [];
        }

        this._eventHandlers[eventName].push(callback);

        return this;
    }
    off(eventName) {
        if (this._eventHandlers.hasOwnProperty(eventName)) {
            this._eventHandlers[eventName].length = 0;
        }
    }
    emit(eventName, args) {
        var eventCallbacks = this._eventHandlers[eventName] || this._eventHandlers.subscribed;
        for (var callback of eventCallbacks) {
            callback.apply(null, args);
        }
    }
    subscribe(callback) {
        var index = this._eventHandlers.subscribed.length;
        this._eventHandlers.subscribed.push(callback);
        return () => {
            this._eventHandlers.subscribed.splice(index, 1);
        };
    }
    _removeHandlers(type) {
        Object.keys(this._eventHandlers).forEach((event) => {
            this.off(event);
        });
    }
}




