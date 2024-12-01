/**
 * 
 * @param {*} records 
 * @param {*} timing 
 */
class SelectQueryEvent {
    constructor(records, pagination, timing) {
        this.state = "select";
        this.timing = timing;
        
        this.getResult = function () {
            if (!Array.isArray(records)) return records;
            return records.splice(0, records.length);
        };

        this.first = function (prop) {
            var record = (!Array.isArray(records)) ? records : records[0];
            return ((record && prop) ? record[prop] : record);
        };

        this.last = function (prop) {
            var record = (!Array.isArray(records)) ? records : records[records.length - 1];
            return ((record && prop) ? record[prop] : record);
        }

        this.limit = function (start, end) {
            if (!Array.isArray(records)) return records;
            return records.slice(start, end);
        };

        this.jDBNumRows = function () {
            if (Array.isArray(records)) return records.length;
            return Object.values(records)[0];
        };

        this.getRow = function (row) {
            return records[row];
        };

        Object.defineProperties(this, {
            pagination: {
                get: () => {
                    return Object.create({
                        totalRecords: records.length,
                        previous: () => {

                        },
                        next: () => {

                        }
                    });
                }
            }
        });
    }

    openCursor(fn) {
        var start = 0;
        var total = this.jDBNumRows();
        var cursorEvent = Object.create({
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

class SelectPagination{
    constructor(context, pagination, totalRecords){
        this.totalRecords = totalRecords;
        this.next = function(){

        };

        this.previous = function(){

        };
    }
}
