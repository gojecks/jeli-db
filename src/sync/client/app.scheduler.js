/**
 * 
 * @param {*} appName 
 */
function ApplicationScheduler(appName) {
    this.appName = appName;
    var _queue = [];
    var _scheduler = [];
    this.interval = null;
    var _this = this;
    var _records = [];

    function checkScheduler() {
        if (_scheduler.length && !_this.interval) {
            _this.interval = setInterval(function() {
                var current = +new Date;
                var newElements = [];
                _scheduler.forEach(function(data) {
                    if (current > data.schedule || 10 <= (data.schedule - current)) {
                        _queue.push(data.content);
                    } else {
                        newElements.push(data);
                    }
                }, 1000); // every second
                // rewrite the schedulerObject
                _scheduler = newElements;
                newElements = null;
            });
            // push our queued messages
            _this.push();
        }
    }

    checkScheduler();

    /**
     * 
     */
    this.scheduler = function(when, content) {
        if ($isNumber(when)) {
            // validate the number
            var current = +new Date;
            if (current > when) {
                throw new Error("Invalid scheduler define, scheduler should in the future");
            }

            _scheduler.push({
                created: current,
                schedule: when,
                content: content
            });
            // trigger our scheduler
            scheduler();
        }
    };

    /**
     * Add email to Queue
     * @param {*} content
     * @param {*} push
     */
    this.addToQueue = function(content, push) {
        _queue.push(content);
        if (push) {
            this.push();
        }
    };

    this.setRecords = function(record) {
        _records.push(record);
    };

    Object.defineProperty(this, '_queue', {
        enumerable: false,
        configurable: true,
        get: function() {
            return _queue;
        }
    });

    Object.defineProperty(this, 'processRecords', {
        enumerable: false,
        configurable: true,
        get: function() {
            return _records;
        }
    });
}

ApplicationScheduler.prototype.push = function() {
    if (!this._queue.length) {
        return;
    }

    this._pushInProgress = true;
    var _this = this;
    var processRecords = {
        started: +new Date,
        failed: [],
        total: 0
    };

    function process() {
        var options = privateApi.buildOptions(_this.appName, '', '/send/email');
        var postData = _this._queue.shift();
        options.data.postData = postData;
        privateApi.$http(options)
            .then(next, function(err) {
                processRecords.failed.push(postData);
                next();
            });
    }

    /**
     * 
     * @param {*} response 
     */
    function next() {
        if (_this._queue.length) {
            ++processRecords.total;
            process();
        } else {
            _this.setRecords({
                started: processRecords.started,
                ended: +new Date,
                failedRequest: processRecords.failed.length,
                successfull: processRecords.total - processRecords.failed.length
            });
            // add the failed process to queue and try again
            if (processRecords.failed.length) {
                _this._queue.push.apply(_this._queue, processRecords.failed);
                processRecords = null;
            }
        }
    }

    next();
};

ApplicationScheduler.prototype.destroyScheduler = function() {
    clearInterval(this.interval);
};