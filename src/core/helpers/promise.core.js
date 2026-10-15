  /**
   * 
   * @param {*} state 
   * @param {*} message 
   */
  function dbSuccessPromiseObject(state, message) {
    return ({ 
        state: state, 
        status: "success", 
        result: (typeof message == 'object' ? message : {message}), 
        code: 200 
    });
  }

  /**
   * 
   * @param {*} message 
   */
  function dbErrorPromiseObject(message) {
      return ({ message: message, status: "error", code: 400 });
  }

  // standard Promise; extension methods (e.g. progress, onCreate) ride along on every promise then() returns
  class DBPromise extends Promise {
    constructor(callback, extension) {
        if (typeof callback !== 'function') {
            throw Error('DBPromise requires a callback method');
        }

        super(callback);
        if (extension) DBPromise.extend(this, extension);
    }

    static extend(promise, extension) {
        Object.defineProperty(promise, '_extension', { value: extension });
        for (const action in extension) promise[action] = extension[action];
        return promise;
    }

    then(done, fail) {
        const next = super.then(done, fail);
        return this._extension ? DBPromise.extend(next, this._extension) : next;
    }

    onSuccess(fn) {
        return this.then(fn);
    }

    onError(fn) {
        return this.then(null, fn);
    }
}

class DBPromiseExtension{
    constructor(callback, events) {
        var eventRegistry = {};
        /**
         *
         * @param {*} event
         * @returns
         */
        this.handlers = (events || []).reduce(function (acc, event) {
            acc[event] = registry(event);
            eventRegistry[event] = [];
            return acc;
        }, {});

        function registry(event) {
            return function (fn) {
                eventRegistry[event].push(fn || callback);
                return this;
            };
        }

        this.call = function (eventName, args) {
            if (eventRegistry[eventName] && eventRegistry[eventName].length) {
                while (eventRegistry[eventName].length) {
                    eventRegistry[eventName].shift().apply(null, args);
                }
            } else {
                callback.apply(null, args);
            }
        };
    }
}

