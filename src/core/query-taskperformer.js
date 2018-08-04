function $query(data) {
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
            return data;
        }

        var _search = [],
            _setLogicPerformer = externalQuery(logic);
        callback = callback || function(item) {
            _search.push(item._data || item);
        };
        //Query the required Data
        //Match the Result with Logic
        //@return : ARRAY Search result
        expect(data).each(function(item, idx) {
            if (_setLogicPerformer.call(null, item, idx)) {
                callback(item, idx);
            }
        });

        return _search;
    };
}


//externalQuery Function
//@param : string
//@return : Function

function externalQuery(logic, replacer) {
    var keyLen;


    function jsonMatcher(res1, res2) {
        return JSON.stringify(res1) == JSON.stringify(res2);
    }

    function objectQueryTaskPerformer(item) {
        var found = 0;
        //Loop through the logic
        //match found item
        var matcher = item._data || item;
        expect(logic).each(function(_res1, op) {
            if (queryMatcher(_res1, $modelSetterGetter(op, matcher), matcher)) {
                found++;
            }
        });

        return keyLen === found;
    }

    if (logic) {
        if (!$isObject(logic)) {
            logic = _parseCondition(splitStringCondition(logic), replacer);
        }

        keyLen = Object.keys(logic).length;
        return objectQueryTaskPerformer;
    }
}
/**
 * 
 * @param {*} condition 
 */
function _parseCondition(condition, replacer) {
    var ret = {},
        len = condition.length;
    while (len--) {
        if (condition[len]) {
            cCheck = condition[len].split(/:(?:like):/gi);
            if (cCheck.length > 1) { //Like Condition found
                ret[cCheck[0]] = { "$lk": cCheck[1] }
            } else {
                ret = extend(ret, convertExpressionStringToObject(condition[len], replacer));
            }
        }
    }

    return ret;
}

/**
 * 
 * @param {*} query 
 * @param {*} val 
 */
function queryMatcher($query, $val, item) {
    var _fnd = false;
    if ($isObject($query)) {
        var q = Object.keys($query)[0],
            _val = $modelSetterGetter($query[q], item) || $query[q];


        switch (q) {
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
            case ('$lk'):
                _fnd = $inArray(_val, $val || []);
                break;
            case ('$notInArray'):
                _fnd = !$inArray(_val, $val || []);
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
                _fnd = !!$val
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
 * @param {*} expression 
 */

function convertExpressionStringToObject(expression, replacer) {
    var exp = expression.split(/([|()=<>!*+//&-])/ig),
        start = exp.shift(),
        end = exp.pop(),
        operand = exp.join(''),
        _cond = {};
    _cond[start || end] = {};

    /**
     * parse end value before writing
     */
    if (end) {
        var _end = $modelSetterGetter(end, replacer || {}) || jSonParser(end);
    }

    switch (operand) {
        case ("==="):
            _cond[start]['$is'] = _end;
            break;
        case ("=="):
        case ("="):
            _cond[start]['$isEqual'] = end;
            break;
        case (">="):
            _cond[start]['$gte'] = _end;
            break;
        case (">"):
            _cond[start]['$gt'] = _end;
            break;
        case ("<="):
            _cond[start]['$lte'] = _end;
            break;
        case ("<"):
            _cond[start]['$lt'] = _end;
            break;
        case ("!=="):
            _cond[start]['$not'] = _end;
            break;
        case ("!="):
            _cond[start]['$isNot'] = _end;
            break;
        case ("!"):
            _cond[end]["$!"] = false;
            break;
        default:
            _cond[start]['$!'] = true;
            break;
    }
    return _cond;
}