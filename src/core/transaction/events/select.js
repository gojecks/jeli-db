/**
 * 
 * @param {*} ret 
 * @param {*} objectStore 
 */
function SelectQueryEvent(ret, objectStore) {
    this.getResult = function() {
        return objectStore;
    };

    this.first = function() {
        return objectStore[0];
    };

    this.limit = function(start, end) {
        return copy(objectStore).slice(start, end);
    };

    /**
     * add the ret object to the instance
     */
    var _this = this;
    Object.keys(ret).forEach(function(key) {
        _this[key] = ret[key];
    });
}

SelectQueryEvent.prototype.jDBNumRows = function() {
    return this.getResult().length;
};

SelectQueryEvent.prototype.getRow = function(row) {
    return this.getResult()[row];
};

SelectQueryEvent.prototype.openCursor = function(fn) {
    var start = 0,
        data = this.getResult(),
        cursorEvent = ({
            result: {
                value: [],
            },
            continue: function() {
                //increment the start cursor point
                if (data.length > start) {
                    cursorEvent.result.value = data[start];
                    start++;
                    fn(cursorEvent);
                }

            },
            prev: function() {
                //decrement the start point
                if (start) {
                    start--;
                }

                cursorEvent.continue();
            },
            index: function() {
                return start;
            }
        });

    //initialize the cursor event
    cursorEvent.continue();
};