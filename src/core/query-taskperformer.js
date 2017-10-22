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
        var _search = [];
        if ($isArray(data)) {
            var _setLogicPerformer = new externalQuery(logic);

            //Query the required Data
            //Match the Result with Logic
            //@return : ARRAY Search result
            expect(data).search(null, function(item, idx) {
                var found = _setLogicPerformer(item, idx);
                if (found) {
                    if ($isFunction(callback)) {
                        callback(item, idx);
                    } else {
                        _search.push(item._data || item);
                    }
                }
            });

            return _search;
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
}


//externalQuery Function
//@param : string
//@return : Function

function externalQuery(logic) {
    var keyLen,
        pCondition;

    //parse Condition
    function _parseCondition(condition) {
        var ret = { like: [], normal: [] };
        for (var a in condition) {
            if (condition[a]) {
                var cCheck = condition[a].split(/:(?:like):/gi),
                    cret = { exp: condition[a], task: cCheck }; //split the like condition
                if (cCheck.length > 1) { //Like Condition found
                    ret.like.push(cret);
                } else {
                    ret.normal.push(cret);
                }
            }
        }

        return ret;
    }

    function queryMatcher($query, $val) {
        if ($isObject($query)) {
            for (var q in $query) {
                var _val = $query[q];
                switch (q) {
                    case ("$lte"):
                        return _val <= $val;
                        break;
                    case ("$gte"):
                        return _val >= $val;
                        break;
                    case ('$lt'):
                        return _val < $val;
                        break;
                    case ('$gt'):
                        return _val > $val;
                        break;
                    case ('$inArray'):
                        return $inArray(_val, $val || []);
                        break;
                    case ('$notInArray'):
                        return !$inArray(_val, $val || []);
                        break;
                    case ('$is'):
                        return $isEqual(_val, $val);
                        break;
                    case ('$not'):
                        return !$isEqual(_val, $val);
                        break;
                    case ('$isDefined'):
                        return $isEqual(_val, !$isEmpty($val));
                        break;
                }
            }
        } else {
            return $query == $val;
        }
    }

    function jsonMatcher(res1, res2) {
        return JSON.stringify(res1) == JSON.stringify(res2);
    }

    this.objectQueryTaskPerformer = function(item) {
        var found = 0;
        //Loop through the logic
        //match found item
        var matcher = item._data || item;
        for (var op in logic) {
            var _res1 = logic[op],
                _res2 = maskedEval(op, matcher);

            if ($isObject(_res2)) {
                if (jsonMatcher(_res1, _res2)) {
                    found++;
                }
            } else {
                if (queryMatcher(_res1, _res2)) {
                    found++;
                }
            }
        }

        return keyLen === found;
    };

    this.likeQueryTaskPerformer = function(item, idx) {
        var found = false,
            cLogic = logic;
        //Loop through the logic
        //match found item
        var lLen = pCondition.like.length,
            matcher = item._data || item;

        while (lLen--) {
            var cur = String(maskedEval(pCondition.like[lLen].task[0], item._data || item)),
                fnd = (cur.toLowerCase().search(String(pCondition.like[lLen].task[1]).toLowerCase())) > -1;

            cLogic = cLogic.replace(pCondition.like[lLen].exp, fnd);
        }

        if (pCondition.normal.length) {
            var lLen = pCondition.normal.length;
            while (lLen--) {
                cLogic = cLogic.replace(pCondition.normal[lLen].exp, maskedEval(pCondition.normal[lLen].task[0], matcher));
            }
        }

        return maskedEval(cLogic);
    };

    this.normalQueryTaskPerformer = function(item) {
        return maskedEval(logic, (item._data || item));
    };

    if (logic) {
        if ($isObject(logic)) {
            keyLen = Object.keys(logic).length;
            return this.objectQueryTaskPerformer;
        } else {
            logic = $removeWhiteSpace(logic);
            pCondition = _parseCondition(logic.split(/[&&||]/gi));
            if (pCondition.like.length) {
                return this.likeQueryTaskPerformer;
            } else {
                return this.normalQueryTaskPerformer;
            }
        }
    } else {
        return function() {
            //push data into _search
            return true;
        }
    }
}