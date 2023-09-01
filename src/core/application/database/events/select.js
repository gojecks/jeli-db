/**
 * 
 * @param {*} records 
 * @param {*} timing 
 */
function SelectQueryEvent(records, timing) {
    this.state = "select";
    this.timing = timing;
    this.getResult = function() {
        return records;
    };

    this.first = function() {
        return records[0];
    };

    this.limit = function(start, end) {
        return records.slice(start, end);
    };

    this.jDBNumRows = function() {
        return records.length;
    };

    this.getRow = function(row) {
        return records[row];
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