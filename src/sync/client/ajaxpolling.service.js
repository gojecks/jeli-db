/**
 * 
 * @param {*} options 
 */
function AjaxPollingService(options) {
    RealtimeAbstract.call(this, options);
    var _this = this;
    var ctimer = this.options.timer;

    function pollUpdate() {
        /**
         * 
         * @param {*} res 
         */
        function processResponse(res) {
            if ($isEqual(res.type, 'report')) {
                return startChunkState(_this, res, _polling);
            } else if ($isEqual(res.type, 'message')) {
                return errorPolling();
            }

            if (res.destroy) {
                return _this.disconnect();
            }

            // update promise handler
            _this.options.trial = 1;
            updatePromiserHandler(_this, res);
            _polling(ctimer);
        }

        /**
         * error polling
         */
        function errorPolling() {
            return _polling(getSleepTimer(_this.options));
        }

        /**
         * perform request
         */
        _this.pollRequest()
            .then(processResponse, function(res) {
                if (!$isEqual(res.statusCode, 401)) {
                    errorPolling();
                }
            });
    }

    function _polling(timer) {
        if (_this.destroyed) return;
        _this.options.timerId = setTimeout(pollUpdate, timer);
    }

    this.start = function(callback) {
        if (privateApi.getNetworkResolver('serviceHost', this.dbName)) {
            /**
             * start the polling
             */
            this.callback = callback;
            _polling();
        }
    };
}

AjaxPollingService.prototype = Object.create(RealtimeAbstract.prototype);
AjaxPollingService.prototype.constructor = RealtimeAbstract;

AjaxPollingService.prototype.disconnect = function() {
    this.destroyed = true;
    clearTimeout(this.options.timerId);
};