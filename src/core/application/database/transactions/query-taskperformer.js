"use strict";

function _querySortPerformer() {
    var sortArguments = arguments;
    var data = this;
    if (isarray(data)) {
        return data.sort(function (obj1, obj2) {
            /*
             * save the arguments object as it will be overwritten
             * note that arguments object is an array-like object
             * consisting of the names of the properties to sort by
             */
            var props = sortArguments,
                i = 1,
                result = 0,
                numberOfProperties = props.length - 1;
            /* try getting a different result from 0 (equal)
             * as long as we have extra properties to compare
             */
            while (result === 0 && i < numberOfProperties) {
                result = compare(props[i])(obj1, obj2);
                i++;
            }

            return result;
        });
    }

    function compare(property) {
        var sortOrder = 1;
        return function (a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        };
    }

    return data;
}


/**
 * 
 * @param {*} data 
 * @param {*} logic 
 * @param {*} callback 
 * @param {*} limit 
 * @returns 
 */
function queryPerformer(data, logic, callback, limit) {
    /**
     * return data when logic is undefined
     */
    var searchResult = [];
    var logicPerformer = externalQuery(logic);
    callback = callback || function (item) {
        searchResult.push(item._data || item);
    };
    //Query the required Data
    //Match the Result with Logic
    //@return : ARRAY Search result
    var len = 0;
    while (data.length > len) {
        if (limit && searchResult.length === limit) {
            return searchResult;
        } else if (logicPerformer(data[len], len)) {
            callback(data[len], len);
        }
        len++;
    }

    return searchResult;
}

var cachedLogics = new Map();
/**
 * 
 * @param {*} logic 
 * @param {*} replacer 
 * @returns 
 */
function externalQuery(logic, replacer) {
    function objectQueryTaskPerformer(item) {
        if (logic.byRefs) {
            return logic.byRefs.includes(item._ref);
        }

        //Loop through the logic
        //match found item
        var conditionValue = item._data || item;
        var checkConditions = function (condition) {
            var keys = Object.keys(condition);
            for (var key of keys) {
                if (!_matcher(condition[key], modelGetter(key, conditionValue), conditionValue))
                    return false;
            }

            return true;
        };

        return logic.some(checkConditions);
    }

    if (logic) {
        if (isstring(logic)) {
            if (!cachedLogics.has(logic)) {
                cachedLogics.set(logic, _parseCondition(logic, replacer));
            }
            logic = cachedLogics.get(logic);
        }
        /**
         * user defined logic as object
         * convert to array
         */
        else if (isobject(logic) && !logic.byRefs) {
            logic = [logic];
        }
        // create or expect instance
        return objectQueryTaskPerformer;
    }

    // fallback if no logic found
    return function () {
        return true;
    }
}

var _operatorMethods = new (function () {
    this.lte = function (queryValue, recordValue) {
        return queryValue <= recordValue;
    };
    this.gte = function (queryValue, recordValue) {
        return queryValue >= recordValue;
    };
    this.lt = function (queryValue, recordValue) {
        return queryValue < recordValue;
    };
    /**
     * Min-Max
     * @param {*} queryValue 
     * @param {*} recordValue 
     * @returns 
     */
    this.lgte = function (queryValue, recordValue) {
        if (!isarray(queryValue)) return false;
        return (queryValue[0] >= recordValue || ((queryValue[1] || 0) <= recordValue));
    };

    this.gt = function (queryValue, recordValue) {
        return queryValue > recordValue;
    };
    this.inclause = this.inarray = function (queryValue, recordValue) {
        return inarray(queryValue, recordValue);
    };
    this.inarrayr = function (queryValue, recordValue) {
        return inarray(recordValue, queryValue);
    };
    this.lk = function (queryValue, recordValue) {
        return (String(queryValue || "").toLowerCase()).search((recordValue || '').toLowerCase()) > -1;
    };
    this.notinclause =  this.notinarray = function (queryValue, recordValue) {
        return !inarray(queryValue, recordValue);
    };
    this.notinarrayr = function (queryValue, recordValue) {
        return !inarray(recordValue, queryValue);
    };
    this.is = function (queryValue, recordValue) {
        return isequal(recordValue, queryValue);
    };
    this.not = function (queryValue, recordValue) {
        return !isequal(recordValue, queryValue);
    };
    this.isdefined = function (queryValue, recordValue) {
        return isequal(recordValue, !isempty(queryValue));
    };
    this.isnot = function (queryValue, recordValue) {
        return recordValue != queryValue;
    };
    this.eq = function (queryValue, recordValue) {
        return recordValue == queryValue;
    };
    this.truthy = function (queryValue, recordValue) {
        return (!!queryValue == recordValue);
    };
    this.struthy = function (queryValue, recordValue) {
        return !queryValue;
    };

    this.datediff = function (queryValue, recordValue) {
        if (!isarray(recordValue) || !queryValue) return false;
        var dateDiff = (+new Date  - queryValue);
        return ({
            m: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 30 * 1000)) <= diff,
            mn: (diff) => Math.round(dateDiff / (60 * 60 * 1000)) <= diff,
            d: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 1000)) <= diff,
            y: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 30.42 * 12 * 1000)) <= diff
        })[recordValue[1]](recordValue[0]);
    }
})();

/**
 * 
 * @param {*} $query 
 * @param {*} fieldValue 
 * @param {*} item 
 * @returns 
 */
function _matcher($query, fieldValue, item) {
    if (isobject($query)) {
        var recordValue = modelGetter($query.value, item) || $query.value;
        return _operatorMethods[$query.type.toLowerCase()](fieldValue, recordValue)
    } else if (isobject(fieldValue)) {
        return jsonMatcher($query, fieldValue);
    }

    return $query == fieldValue;
}