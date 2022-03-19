/**
 * 
 * @param {*} ret 
 * @param {*} objectStore 
 * @param {*} timing 
 */
function SelectQueryEvent(objectStore, timing) {
    this.state = "select";
    this.timing = timing;
    this.getResult = function() {
        return objectStore;
    };

    this.first = function() {
        return objectStore[0];
    };

    this.limit = function(start, end) {
        return copy(objectStore).slice(start, end);
    };

    this.jDBNumRows = function() {
        return objectStore.length;
    };

    this.getRow = function(row) {
        return objectStore[row];
    };
}

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