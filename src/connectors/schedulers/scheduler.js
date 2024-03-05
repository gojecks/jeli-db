/**
 * 
 * @param {*} appName 
 */
function Scheduler(appName) {
    this.appName = appName;
    this.storageName = '[[$.jeliScheduler]]';
    this._queue = [];
    this._scheduler = [];
    this.interval = null;
    this._records = [];
    this.retrieveSavedSchedulers();
}

Scheduler.prototype.retrieveSavedSchedulers = function () {
    var data = JSON.parse(localStorage.getItem(this.storageName) || 'null');
    if (data) {
        this._scheduler = data.schedulers || [];
        this._queue = data.queue || [];
    }
    data = null;
    this.checkScheduler();
}

/**
 * Add email to Queue
 * @param {*} content
 * @param {*} push
 */
Scheduler.prototype.addToQueue = function (payload, url) {
    this._queue.push({ payload, url });
}

/**
 * 
 * @param {*} schedule 
 * @param {*} payload 
 * @param {*} url 
 */
Scheduler.prototype.scheduler = function (when, payload, url) {
    if (isnumber(when)) {
        // validate the number
        var current = +new Date;
        if (current > when) {
            throw new Error("Invalid scheduler define, scheduler should in the future");
        }

        this._scheduler.push({
            created: current,
            when,
            content: {
                payload,
                url
            }
        });
        // trigger our scheduler
        this.checkScheduler();
    }
}

Scheduler.prototype.checkScheduler = function () {
    if (this._scheduler.length && !this.interval) {
        this.interval = setInterval(() => {
            var current = +new Date;
            var newElements = [];
            for (var data of this._scheduler) {
                if (current > data.when || 10 <= (data.when - current)) {
                    this._queue.push(data.content);
                } else {
                    newElements.push(data);
                }
            }
            // rewrite the schedulerObject
            this._scheduler = newElements;
            newElements = null;
            // push our queued messages
            this.push();
        }, 1000);
    }
}

Scheduler.prototype.push = function () {
    if (!this._queue.length) {
        return;
    }

    this._pushInProgress = true;
    var processRecords = {
        started: +new Date,
        failed: [],
        total: 0
    };

    var process = () => {
        var queue = this._queue.shift();
        var request = Scheduler.$privateApi.buildHttpRequestOptions(this.appName, { path: queue.url });
        request.data = queue.payload;
        Scheduler.$privateApi.$http(request)
            .then(next, err => {
                processRecords.failed.push(queue);
                next();
            });
    };

    /**
     * 
     * @param {*} response 
     */
    var next = () => {
        if (this._queue.length) {
            ++processRecords.total;
            process();
        } else {
            this.processRecords({
                started: processRecords.started,
                ended: +new Date,
                failedRequest: processRecords.failed.length,
                successfull: processRecords.total - processRecords.failed.length
            });
            // add the failed process to queue and try again
            if (processRecords.failed.length) {
                this._queue.push.apply(this._queue, processRecords.failed);
                processRecords = null;
            }
        }
    }

    next();
};

Scheduler.prototype.destroyScheduler = function () {
    clearInterval(this.interval);
    this._queue.length = 0;
    this._scheduler.length = 0;
    this.interval = null;
    this._records.length = 0;
}

Scheduler.prototype.listenForReload = function(){
    // listen for  window beforeunload change to persist data
    window.addEventListener('beforeunload', () => {
        localStorage.setItem(this.storageName, JSON.stringify({
            schedulers: this.scheduler,
            queue: this.queue
        }));
    }, false);
}