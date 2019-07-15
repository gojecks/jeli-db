"use strict";

function $query(data) {
    Object.defineProperty(this, 'data', {
        set: function(cdata) {
            data = cdata;
        }
    });

    this.sortBy = function() {
        var sortArguments = arguments;
        if ($isArray(data)) {
            return data.sort(function(obj1, obj2) {
                /*
                 * save the arguments object as it will be overwritten
                 * note that arguments object is an array-like object
                 * consisting of the names of the properties to sort by
                 */
                var props = sortArguments,
                    i = 0,
                    result = 0,
                    numberOfProperties = props.length;
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

        return data;
    };


    function compare(property) {
        var sortOrder = 1;
        return function(a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        };
    }

    this.where = function(logic, callback) {
        if ($isArray(data) && logic) {
            var filter = $removeWhiteSpace(logic).split(/(?:like):/gi);

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
    };


    this._ = function(logic, callback, matcher) {
        /**
         * return data when logic is undefined
         */
        if (!logic) {
            return data.map(function(item) { return item._data; });
        }

        var _search = [],
            _setLogicPerformer = externalQuery(logic);
        callback = callback || function(item) {
            _search.push(item._data || item);
        };
        //Query the required Data
        //Match the Result with Logic
        //@return : ARRAY Search result
        var len = 0;
        while (data.length > len) {
            if (_setLogicPerformer.call(null, data[len], len)) {
                callback(data[len], len);
            }
            len++;
        }

        return _search;
    };
}


//externalQuery Function
//@param : string
//@return : Function

function externalQuery(logic, replacer) {

    function jsonMatcher(res1, res2) {
        return JSON.stringify(res1) == JSON.stringify(res2);
    }

    function objectQueryTaskPerformer(item) {
        var found = false;
        //Loop through the logic
        //match found item
        var matcher = item._data || item;
        logic.forEach(function(param) {
            if (found) {
                return;
            }
            var keys = Object.keys(param);
            var matched = 0;
            keys.forEach(function(key) {
                if ($query.matcher(param[key], ModelSetterGetter(key, matcher), matcher)) {
                    matched++;
                }
            });

            found = keys.length == matched;
        });

        return found;
    }

    if (logic) {
        if ($isString(logic)) {
            logic = $query._parseCondition(logic, replacer);
        }
        /**
         * user defined logic as object
         * convert to array
         */
        else if ($isObject(logic)) {
            logic = [logic];
        }
        // create or expect instance
        return objectQueryTaskPerformer;
    }
}
/**
 * 
 * @param {*} condition 
 */
$query._parseCondition = function(condition, replacer) {
    condition = $removeWhiteSpace(condition || "").split(/[||]/gi)
        .filter(function(cond) { return !!cond; })
        .map(function(cond) {
            return cond.split(/[&&]/gi).filter(function(cond) {
                return !!cond;
            });
        });

    var ret = [],
        len = condition.length,
        cCheck;
    while (len--) {
        if (condition[len]) {
            var params = {};
            condition[len].forEach(function(cond) {
                cCheck = cond.replace(/\((.*)\)/, "~$1").split("~");
                //Like Condition found
                if (cCheck.length > 1) {
                    var clause = buildSelectQuery(cCheck[1], 0, /[@]/);
                    switch (cCheck[0].toLowerCase()) {
                        case ("like"):
                            params[clause.field] = {
                                type: "$lk",
                                value: clause.value
                            };
                            break;
                        case ("in"):
                            params[clause.field] = clause;
                            clause.type = "$inClause";
                            break;
                        case ("notin"):
                            params[clause.field] = clause;
                            clause.type = "$notInClause";
                            break;
                    }
                } else {
                    $query.convertExpressionStringToObject(cond, replacer, params);
                }
            });
            ret.push(params);
        }
    }

    return ret;
}

/**
 * 
 * @param {*} $query 
 * @param {*} $val 
 * @param {*} item 
 */
$query.matcher = function($query, $val, item) {
    var _fnd = false;
    if ($isObject($query)) {
        var _val = ModelSetterGetter($query.value, item) || $query.value;
        switch ($query.type) {
            case ("$lte"):
                _fnd = $val <= _val;
                break;
            case ("$gte"):
                _fnd = $val >= _val;
                break;
            case ('$lt'):
                _fnd = $val < _val;
                break;
            case ('$gt'):
                _fnd = $val > _val;
                break;
            case ('$inArray'):
            case ('$inClause'):
                _fnd = $inArray($val, _val);
                break;
            case ('$lk'):
                _fnd = (($val || "").toLowerCase()).search(_val.toLowerCase()) > -1;
                break;
            case ('$notInArray'):
            case ('$notInClause'):
                _fnd = !$inArray($val, _val);
                break;
            case ('$is'):
                _fnd = $isEqual(_val, $val);
                break;
            case ('$not'):
                _fnd = !$isEqual(_val, $val);
                break;
            case ('$isDefined'):
                _fnd = $isEqual(_val, !$isEmpty($val));
                break;
            case ('$isNot'):
                _fnd = _val != $val;
                break;
            case ('$isEqual'):
                _fnd = _val == $val;
                break;
            case ('$!'):
                _fnd = (!!$val == _val);
                break;
        }
        return _fnd;
    } else if ($isObject($val)) {
        return jsonMatcher($query, $val);
    }

    return $query == $val;
}

/**
 * 
 * @param {*} value 
 */
function convertValueToArray(value) {
    return JSON.parse('[' + (value || '') + ']');
}

/**
 * 
 * @param {*} expression 
 * symbols and meaning
 */

$query.convertExpressionStringToObject = function(expression, replacer, params) {
    var exp = expression.split(/([|()\[\]=~<>!*+//&-])/ig),
        start = exp.shift(),
        end = exp.pop(),
        operand = exp.join(''),
        value,
        type;
    /**
     * parse end value before writing
     */
    if (end) {
        value = ModelSetterGetter(end, replacer || {}) || jSonParser(end);
    }
    switch (operand) {
        case ("==="):
            type = '$is';
            break;
        case ("=="):
        case ("="):
            type = '$isEqual';
            value = end;
            break;
        case (">="):
            type = '$gte';
            break;
        case (">"):
            type = '$gt';
            break;
        case ("<="):
            type = '$lte';
            break;
        case ("<"):
            type = '$lt';
            break;
        case ("!="):
            type = '$not';
            break;
        case ("!=="):
            type = '$isNot';
            break;
        case ("!"):
            type = "$!";
            value = false;
            break;
        case ("!!"):
            type = "$!";
            value = true;
            break;
        case ("[]"):
        case ("[=]"):
            type = "$inArray";
            value = convertValueToArray(value);
            break;
        case ("![]"):
        case ("[!]"):
            type = "$notInArray";
            value = convertValueToArray(value);
            break;
        case ("~"):
            type = "$lk";
            break;
        default:
            type = '$!';
            value = true;
            break;
    }

    // assign the prop to the params
    params[start || end] = {
        type: type,
        value: value
    };
    return params;
}