/**
 * 
 * @param {*} query 
 * @param {*} entryPoint 
 * @param {*} regexp 
 * @returns 
 */
function buildSelectQuery(query, entryPoint, regexp) {
    /**
     * split the query on regex an
     */
    if (regexp) {
        query = query.split(regexp).map(function(k) { return k.trim(); });
        entryPoint = entryPoint || 0;
    }

    var definition = {};
    if (query.length > entryPoint) {
        if ($isString(query[entryPoint])) {
            // splice our query
            // set definition
            [].concat.call(query).splice(entryPoint).map(function(qKey) {
                qKey = qKey.replace(/\((.*)\)/, "~$1").split("~");
                // function Query
                if (qKey.length > 1) {
                    if ($isJsonString(qKey[1])) {
                        definition[qKey[0]] = JSON.parse(qKey[1]);
                    } else {
                        if ($inArray(qKey[0], ["join"])) {
                            definition[qKey[0]] = [buildSelectQuery(qKey[1], 0, /[@]/)];
                        } else {
                            definition[qKey[0]] = qKey[1];
                        }
                    }

                }
            });
        } else {
            return query[entryPoint];
        }
    }

    return definition;
}

/**
 * 
 * @param {*} serverQuery 
 * @param {*} replacer 
 * @returns 
 */
function parseServerQuery(serverQuery, replacer) {
    /**
     * 
     * @param {*} query 
     */
    function _parse(query) {
        var parsed = ApplicationInstanceJQL.parser(query, replacer);
        var tQuery = Object.assign({ fields: parsed[0] }, buildSelectQuery(parsed, 0));
        tQuery.where = _parseCondition(tQuery.where, replacer);
        tQuery.tables = parsed[1].split(',').reduce(function(accum, tbl) {
            tbl = tbl.split(' as ').map(trim);
            accum[tbl[1] || tbl[0]] = tbl[0];
            return accum;
        }, {});
        if (tQuery.join) {
            tQuery.join.forEach(function(jQuery) {
                if (jQuery.where) {
                    jQuery.where = _parseCondition(jQuery.where, replacer);
                }
            });
        }

        return tQuery;
    }

    if ($isArray(serverQuery)) {
        return Object.reduce(function(accum, query) {
            accum.push(_parse(query));
            return accum;
        }, []);
    }

    return _parse(serverQuery);
}

/**
 * 
 * @param {*} condition 
 */
function _parseCondition(condition, replacer) {
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
                                type: "lk",
                                value: clause.value
                            };
                            break;
                        case ("in"):
                            params[clause.field] = clause;
                            clause.type = "inClause";
                            break;
                        case ("notin"):
                            params[clause.field] = clause;
                            clause.type = "notInClause";
                            break;
                    }
                } else {
                    _convertExpressionStringToObject(cond, replacer, params);
                }
            });
            ret.push(params);
        }
    }

    return ret;
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

function _convertExpressionStringToObject(expression, replacer, params) {
    var exp = expression.split(/([|()\[\]=~<>!*&])/ig),
        start = exp.shift(),
        end = exp.pop(),
        operand = exp.join(''),
        value,
        type;
    /**
     * parse end value before writing
     */
    if (end) {
        value = modelGetter(end, replacer || {}) || jSonParser(end);
    }
    switch (operand) {
        case ("==="):
            type = 'is';
            break;
        case ("=="):
        case ("="):
            type = 'eq';
            value = end;
            break;
        case (">="):
            type = 'gte';
            break;
        case (">"):
            type = 'gt';
            break;
        case ("<="):
            type = 'lte';
            break;
        case ("<"):
            type = 'lt';
            break;
        case ("!="):
            type = 'not';
            break;
        case ("!=="):
            type = 'isNot';
            break;
        case ("!"):
            type = "truthy";
            value = false;
            break;
        case ("!!"):
            type = "truthy";
            value = true;
            break;
        case ("[]"):
            type = "inArray";
            value = value;
            break;
        case ("[=]"):
            type = 'inClause';
            value = convertValueToArray(value);
            break;
        case ("![]"):
            type = "notInArray";
            value = value;
            break;
        case ("[!]"):
            type = 'notInClause';
            value = convertValueToArray(value);
            break;
        case ("~"):
            type = "lk";
            break;
        default:
            type = 'truthy';
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