"use strict";

function _querySortPerformer() {
    var sortArguments = arguments;
    var data = this;
    if (isarray(data)) {
        return data.sort(function(obj1, obj2) {
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
        return function(a, b) {
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
 * @returns 
 */
function _queryWherePerformer(data, logic, callback) {
    if (isarray(data) && logic) {
        var filter = removewhitespace(logic).split(/(?:like):/gi);

        return data.filter(function(item, idx) {
            var found = ((filter.length > 1) ? (String(item[filter[0]] || '').toLowerCase().search(String(filter[1]).toLowerCase()) !== -1) : $logicChecker(logic, item));

            if (callback && found) {
                callback.call(item, idx);
            }
            //set the data if found
            return found;
        });
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
function _queryPerformer(data, logic, callback, limit) {
    /**
     * return data when logic is undefined
     */
    if (!logic) {
        return data.map(function(item) { return item._data || item; });
    }

    var searchResult = [];
    var logicPerformer = externalQuery(logic);
    callback = callback || function(item) {
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
        var found = false;
        //Loop through the logic
        //match found item
        var matcher = item._data || item;
        for (var param of logic) {
            if (found) {
                return true;
            }
            var keys = Object.keys(param);
            var matched = 0;
            for (var key of keys) {
                if (_matcher(param[key], modelGetter(key, matcher), matcher)) {
                    matched++;
                }
            }
            found = keys.length == matched;
        }

        return found;
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
        else if (isobject(logic)) {
            logic = [logic];
        }
        // create or expect instance
        return objectQueryTaskPerformer;
    }
}

var _operatorMethods = (function() {
    var operatorMethods = {};
    operatorMethods['lte'] = function(queryValue, recordValue) {
        return queryValue <= recordValue;
    };
    operatorMethods['gte'] = function(queryValue, recordValue) {
        return queryValue >= recordValue;
    };
    operatorMethods['lt'] = function(queryValue, recordValue) {
        return queryValue < recordValue;
    };
    /**
     * Min-Max
     * @param {*} queryValue 
     * @param {*} recordValue 
     * @returns 
     */
    operatorMethods['lgte'] = function(queryValue, recordValue) {
        if (!isarray(queryValue)) return false;
        return (queryValue[0] >= recordValue || ((queryValue[1] || 0) <= recordValue));
    };

    operatorMethods['gt'] = function(queryValue, recordValue) {
        return queryValue > recordValue;
    };
    operatorMethods['inClause'] = function(queryValue, recordValue) {
        return inarray(queryValue, recordValue);
    };
    operatorMethods['inArray'] = function(queryValue, recordValue) {
        return inarray(recordValue, queryValue);
    };
    operatorMethods['lk'] = function(queryValue, recordValue) {
        return (String(queryValue || "").toLowerCase()).search((recordValue || '').toLowerCase()) > -1;
    };
    operatorMethods['notInClause'] = function(queryValue, recordValue) {
        return !inarray(queryValue, recordValue);
    };
    operatorMethods['notInArray'] = function(queryValue, recordValue) {
        return !inarray(recordValue, queryValue);
    };
    operatorMethods['is'] = function(queryValue, recordValue) {
        return isequal(recordValue, queryValue);
    };
    operatorMethods['not'] = function(queryValue, recordValue) {
        return !isequal(recordValue, queryValue);
    };
    operatorMethods['isDefined'] = function(queryValue, recordValue) {
        return isequal(recordValue, !isempty(queryValue));
    };
    operatorMethods['isNot'] = function(queryValue, recordValue) {
        return recordValue != queryValue;
    };
    operatorMethods['eq'] = function(queryValue, recordValue) {
        return recordValue == queryValue;
    };
    operatorMethods['truthy'] = function(queryValue, recordValue) {
        return (!!queryValue == recordValue);
    };
    operatorMethods['struthy'] = function(queryValue, recordValue) {
        return !queryValue;
    };

    return operatorMethods;
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
        return _operatorMethods[$query.type](fieldValue, recordValue)
    } else if (isobject(fieldValue)) {
        return jsonMatcher($query, fieldValue);
    }

    return $query == fieldValue;
}