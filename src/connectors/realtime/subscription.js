class Subscription {
    _subscribers = [];
    _pendingValues = [];

    emit(data) {
        if (!this._subscribers.length) {
            this._pendingValues.push(data);
        } else {
            this._subscribers.forEach(callback => callback(data));
        }
    }

    subscribe(callback) {
        this._subscribers.push(callback);
        if (this._pendingValues.length) {
            while (this._pendingValues.length) {
                callback(this._pendingValues.shift());
            }
        }
    }
}