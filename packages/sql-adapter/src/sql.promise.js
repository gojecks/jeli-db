/**
 *
 * @param {*} total
 */
class SqlFacadePromise {
    constructor(total, callback) {
        this.succ = 0;
        this.err = 0;
        this.total = total || 0;
        this.handlers = [function () { }, function () { }];

        callback((tx, res) => {
            this.succ++;
            this.finalize(tx, res);
        }, (tx, err) => {
            this.err++;
            this.finalize(tx, err);
        });
    }

    finalize() {
        if (this.err == this.total) {
            this.handlers.pop().apply(null, arguments);
        } else if (this.succ === this.total) {
            this.handlers.shift().apply(null, arguments);
        } else if ((this.succ + this.err) == this.total) {
            this.handlers.shift()({
                success: this.succ,
                failed: this.err
            });
        }
    }

    setTotal(val) {
        this.total = val;
    };

    /**
     * @param succ
     * @param err
     */
    then(succ, err) {
        if (succ)
            this.handlers[0] = succ;
        if (err)
            this.handlers[1] = err;
        //trigger finalize
        this.finalize();
    };
}