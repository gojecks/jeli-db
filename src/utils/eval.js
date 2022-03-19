/**
 * 
 * @param {*} expression 
 * @param {*} context 
 */
function maskedEval(expression, context) {
    if ((/([|<>=()\-!*+&\/\/:])/gi).test(expression)) {
        // execute script in private context
        return (new Function("with(this) { try{ return " + expression + " }catch(e){ return undefined; } }")).call(context || {})
    } else {
        return simpleContextMapper(expression, context);
    }
}

//@function simpleBooleanParser
//credit to  CMCDragonkai for the idea
function simpleBooleanParser($boolValue) {
    return ({
        'true': true,
        '1': true,
        'on': true,
        'yes': true,
        'false': false,
        '0': false,
        'off': false,
        'no': false,
        'null': null,
        'undefined': undefined
    })[$boolValue];
}

/**
 * 
 * @param {*} arg 
 * @param {*} sub 
 */
function simpleArgumentParser(arg) {
    var booleanMatcher = simpleBooleanParser(arg),
        isNum = Number(arg);
    if (arg && !isNaN(isNum)) {
        return isNum;
    } else if (!$isUndefined(booleanMatcher)) {
        return booleanMatcher;
    }

    return arg;
}

/**
 * 
 * @param {*} key 
 * @param {*} model 
 */
function generateArrayKeyType(key, model) {
    if (-1 < key.indexOf("[")) {
        model = model || {};
        return key.split('[').map(function(current) {
            if (current.indexOf(']') > -1) {
                var _key = current.split(']')[0];
                return ((model.hasOwnProperty(_key)) ? model[_key] : _key);
            }

            return current;
        }).join('.');
    }

    return key
}

//RegExp to match is array key
var isArrayKey = new RegExp(/.*\[(\d+)\]/);

/**
 * deepArrayChecker Function
 * deepCheck the key of a require Model
 * if Model type is Array
 * remove array brackect and return the keys
 * 
 * @param {*} create 
 * @param {*} key 
 * @param {*} model 
 * @param {*} value 
 */
function deepArrayChecker(create, key, model, value) {
    key = generateArrayKeyType(key, model).split(".");
    var end = key.pop(),
        nModel = matchStringWithArray(key, model, create);
    if (arguments.length > 3) {
        nModel[end] = value;
        return;
    }

    return nModel[end];
};

/**
 * 
 * @param {*} fn 
 */
function generateFnFromString(fn) {
    if (fn.match(/^(?:.*?)\((.*?)\)/)) {
        var arg = fn.substring(fn.indexOf('(') + 1, fn.lastIndexOf(')')),
            namespaces = fn.substring(0, fn.indexOf('(')).split(".");

        function getArgs() {
            return arg ? arg.split(',').map(function(key) {
                if (/'/.test(key)) {
                    return removeSingleQuote(key);
                }

                return generateArrayKeyType(key).split(".");
            }) : [];
        }

        //set nameSpaces
        return {
            arg: getArgs(),
            namespaces: namespaces,
            fn: namespaces.pop()
        };
    }

    return null;
}

/**
 * 
 * @param {*} args 
 * @param {*} context 
 * @param {*} event 
 */
function generateArguments(args, context, event) {
    return args.map(function(arg) {
        if (arg[0] === "$event") {
            return event;
        } else {
            if ($isString(arg)) {
                return arg;
            }

            arg = arg.join('.');
            var param = resolveValueFromContext(arg, context);
            return !$isUndefined(param) ? param : simpleArgumentParser(arg);
        }
    });
}

/**
 * 
 * @param {*} expression 
 * @param {*} context 
 */
function resolveValueFromContext(expression, context) {
    if ($isUndefined(expression) || $isNull(expression) || $isBoolean(expression)) {
        return expression;
    } else if ($isObject(expression)) {
        return parseObjectExpression(expression, context);
    } else if ($isArray(expression)) {
        return expression;
    }

    var value = simpleArgumentParser(expression);
    if ($isEqual(value, expression)) {
        value = maskedEval(expression, context);
    }

    return value;
}

/**
 * 
 * @param {*} expression 
 * @param {*} context 
 */
function parseObjectExpression(expression, context) {
    var _localParser_ = {
        ite: function(obj) {
            return maskedEval(obj.test, context) ? obj.cons : obj.alt;
        }
    };


    return Object.keys(expression).reduce(function(accum, key) {
        var obj = expression[key];
        /**
         * itenary type
         */
        if ($isObject(obj) && obj.test) {
            accum[key] = _localParser_[obj.type](obj);
        } else {
            var value = maskedEval(obj, context);
            accum[key] = $isUndefined(value) ? obj : value;
        }
        return accum;
    }, {});
}

/**
 * 
 * @param {*} key 
 * @param {*} context 
 */
function simpleContextMapper(key, context) {
    key = generateArrayKeyType(key, context).split(".");
    var last = key.pop(),
        dContext = context;

    if (key.length) {
        dContext = resolveContext(key, context);
    }

    if (dContext) {
        var fnString = generateFnFromString(last);
        if (fnString) {
            var args = generateArguments(fnString.arg, context);
            var fn = context[fnString.fn] || function() {};
            return fn.apply(context, args);
        }
        return dContext[last];
    }

    return dContext;
}

/**
 * 
 * @param {*} key 
 * @param {*} context 
 */
function resolveContext(key, context) {
    return key.reduce(function(prev, curr) {
        return prev ? prev[curr] : null;
    }, context || {});
}

/**
 * match key with array type
 * @param {*} key 
 * @param {*} model 
 * @param {*} create 
 */
function matchStringWithArray(key, model, create) {
    var modelDepth = model,
        i = 0;
    while (i <= key.length - 1) {
        modelDepth = createNewInstance(modelDepth, key[i], create, !isNaN(Number(key[i + 1])));
        i++;
    }

    return modelDepth;
}

/**
 * 
 * @param {*} model 
 * @param {*} key 
 * @param {*} create 
 */
function createNewInstance(model, key, create, nextIsArrayKey) {
    var objectType = nextIsArrayKey ? [] : {};
    if (create && !model[key]) {
        model[key] = objectType
    }

    return model && model[key] || objectType;
}

function modelGetter(field, cdata) {
    if (typeof field === 'object' || $isBoolean(field)) return field;
    return field.replace(/(\[)/g, '.').replace(/(\])/g, '').split('.').reduce(function(accum, key) {
        return (accum && accum.hasOwnProperty(key)) ? accum[key] : null;
    }, cdata || {});
}

/**
 * 
 * @param {*} key 
 * @param {*} context 
 * @param {*} create 
 */
function ModelSetterGetter(key, context, create) {
    if (!$isString(key)) {
        return key;
    }

    return deepArrayChecker(create, $removeWhiteSpace(key), context);
}

function matchScopeObject(ckey, fn) {
    var fnd = false;
    for (var i in ckey) {
        if (!$isUndefined(fn)) {
            if (fn.indexOf(ckey[i]) > -1) {
                fnd = ckey[i];
            }
        }
    }

    return fnd;
}

/**
 * split STRING on condition
 */
function splitStringCondition(str) {
    return $removeWhiteSpace(str).split(/[&&||]/gi);
}

/**
 * 
 * @param {*} logic 
 * @param {*} model 
 * @param {*} ignore 
 */
function $logicChecker($logic, elementModel, ignore) {
    var self = this;

    if ($isBooleanValue.indexOf($logic) > -1) {
        return simpleBooleanParser($logic);
    }

    var _evaluate;
    try {
        _evaluate = maskedEval($logic, elementModel);
    } catch (e) {};

    if (_evaluate) {
        return _evaluate;
    }

    /**
     * 
     * @param {*} key 
     * @param {*} list 
     */
    function getFunctionArg(key, list) {
        var nArguments = [];
        if (list && list[key]) {
            var arg = list[parseInt(key) + 2];
            nArguments = generateArguments(arg, elementModel, self);
        }

        return nArguments;
    }

    var splitExpr = $removeWhiteSpace($logic).split(/([|()=<>!*+//&-])/ig),
        len = splitExpr.length;
    while (len--) {
        if (splitExpr[len].match(/[a-zA-Z]/ig)) {
            //get the exprValue from model
            var exprValue = maskedEval(splitExpr[len], elementModel);
            //check if exprValue is a function
            //initialize the function and set the value
            if ($isFunction(exprValue)) {
                //wrap the user function in a masked IIFE
                //IIFE only returns the actually result of the user function
                var arg = getFunctionArg(len, splitExpr);
                //remove the function method from the list
                splitExpr.splice(parseInt(len) + 1, 3);
                exprValue = exprValue.apply(exprValue, arg);
            }
            //check if exprValue is an Object or Array
            //set the value to true
            else if ($isObject(exprValue) || $isArray(exprValue)) {
                exprValue = true;
            }

            //convert null to false as it will be remove 
            //by jolin FN
            if ($isNull(exprValue) || $isUndefined(exprValue)) {
                exprValue = false;
            }

            splitExpr[len] = (($isString(exprValue)) ? "'" + exprValue + "'" : exprValue);
        }
    }
    //MaskedEval 
    return maskedEval(splitExpr.join(''));
}