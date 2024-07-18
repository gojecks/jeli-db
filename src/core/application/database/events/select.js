/**
 * 
 * @param {*} records 
 * @param {*} timing 
 */
class SelectQueryEvent {
    constructor(records, timing) {
        this.state = "select";
        this.timing = timing;
        this.getResult = function () {
            return records.splice(0, records.length);
        };

        this.first = function () {
            return records[0];
        };

        this.last = function () {
            return records[records.length - 1];
        }

        this.limit = function (start, end) {
            return records.slice(start, end);
        };

        this.jDBNumRows = function () {
            return records.length;
        };

        this.getRow = function (row) {
            return records[row];
        };
    }

    openCursor(fn) {
        var start = 0;
        var total = this.jDBNumRows();
        var cursorEvent = ({
            result: {
                value: [],
            },
            continue: () => {
                //increment the start cursor point
                if (total > start) {
                    cursorEvent.result.value = this.getRow(start);
                    start++;
                    fn(cursorEvent);
                }
            },
            prev: function () {
                //decrement the start point
                if (start) {
                    start--;
                }
    
                cursorEvent.continue();
            },
            index: function () {
                return start;
            },
            hasNext: function () {
                return total > start;
            }
        });
    
        //initialize the cursor event
        cursorEvent.continue();
    }
}
