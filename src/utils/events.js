/**
 * 
 * @param {*} prefix 
 * @returns 
 */
function EventEmitters(prefix) {
    var _events = {};

    function EventEmitter() {
        this.broadcast = function(name, arg) {
            var nextFn = _events[name] || function() {};
            nextFn.apply(nextFn, arg);
        };

        this.subscribe = function(name, fn) {
            _events[name] = fn;
            return this;
        };
    }

    /**
     * stack prototypes
     */
    EventEmitter.prototype.destroy = function(name) {
        _events[name] = null;
    };

    EventEmitter.prototype.bind = function(fn, arg) {
        return function() {
            fn.apply(fn, arg || []);
        }
    };

    EventEmitter.prototype.stack = stack;
    EventEmitter.prototype.queue = new stack();

    return (new EventEmitter);
}

/*
  Custom Events (QUEUE and STACKS)
*/
function stack() {
    var _queues = [];
    this.push = function(fn) {
        _queues.push(fn);
        return _obj;
    };

    this.pop = function() {
        var nextFn = _queues.shift() || function() {};
        nextFn.apply(nextFn, arguments);
        return _obj;
    };
};