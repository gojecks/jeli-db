class QueryBuilder {
    /**
     * @param {*} query 
     * @param {*} entryPoint 
     * @param {*} regexp 
     * @returns 
     */
    static buildSelectQuery(query, entryPoint, regexp) {
        /**
         * split the query on regex an
         */
        if (regexp) {
            query = query.split(regexp).map(function (k) { return k.trim(); });
            entryPoint = entryPoint || 0;
        }

        var definition = {};
        if (query.length > entryPoint) {
            if (isstring(query[entryPoint])) {
                // splice our query
                // set definition
                [].concat.call(query).splice(entryPoint).map(function (qKey) {
                    qKey = qKey.replace(/\((.*)\)/, "?$1").split("?");
                    // function Query
                    if (qKey.length > 1) {
                        if ('join' == qKey[0]) {
                            definition[qKey[0]] = [this.buildSelectQuery(qKey[1], 0, /[@]/)];
                        } else {
                            definition[qKey[0]] = jSonParser(qKey[1]);
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
     * @param {*} condition 
     */
    static _parseCondition(condition, replacer) {
        condition = removewhitespace(condition || "").split(/[||]/gi)
            .filter(function (cond) { return !!cond; })
            .map(function (cond) {
                return cond.split(/[&&]/gi).filter(function (cond) {
                    return !!cond;
                });
            });

        var ret = [],
            len = condition.length,
            cCheck;
        while (len--) {
            if (condition[len]) {
                var params = {};
                condition[len].forEach((cond) => {
                    cCheck = cond.replace(/\((.*)\)/, "?$1").split('?');
                    //Like Condition found
                    if (cCheck.length > 1) {
                        var clause = this.buildSelectQuery(cCheck[1], 0, /[@]/);
                        var caseValue = cCheck[0].toLowerCase();
                        if (caseValue == 'like') {
                            params[clause.field] = {
                                type: "lk",
                                value: clause.value
                            };
                        } else {
                            params[clause.field] = clause;
                            clause.type = (caseValue == 'in') ? "inClause" : "notInClause";
                        }
                    } else {
                        this._convertExpressionStringToObject(cond, replacer, params);
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
    static convertValueToArray(value) {
        return JSON.parse('[' + (value || '') + ']');
    }

    /**
     * 
     * @param {*} expression 
     * symbols and meaning
     */

    static _convertExpressionStringToObject(expression, replacer, params) {
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
            case ("<>"):
                type = "lgte";
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
                value = this.convertValueToArray(value);
                break;
            case ("![]"):
                type = "notInArray";
                value = value;
                break;
            case ("[!]"):
                type = 'notInClause';
                value = this.convertValueToArray(value);
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

    static parseValue(replacer) {
        function stringfy(val) {
            return typeof val === "object" ? JSON.stringify(val) : val;
        };

        return function (entry) {
            var exec = /\%(.*?)\%/.exec(entry);
            if (!exec) return entry;
            // straight match
            if (exec && exec.input == exec[0]) {
                return modelGetter(exec[1], replacer);
            }

            entry = entry.replace(/\%(.*?)\%/g, function (_, key) {
                var value = modelGetter(key, replacer);
                return undefined !== value ? stringfy(value) : key;
            });

            return jSonParser(entry);
        };
    }

    /**
    * 
    * @param {*} serverQuery 
    * @param {*} replacer 
    * @returns 
    */
    static parseServerQuery(serverQuery, replacer) {
        /**
         * 
         * @param {*} query 
         */
        function _parse(query) {
            var parsed = QueryBuilder.queryParser(query, replacer);
            var tQuery = Object.assign({ fields: parsed[0] }, QueryBuilder.buildSelectQuery(parsed, 1));
            tQuery.where = QueryBuilder._parseCondition(tQuery.where, replacer);
            tQuery.tables = parsed[1].split(',').reduce(function (accum, tbl) {
                tbl = tbl.split(' as ').map(trim);
                accum[tbl[1] || tbl[0]] = tbl[0];
                return accum;
            }, {});
            if (tQuery.join) {
                tQuery.join.forEach(function (jQuery) {
                    if (jQuery.where) {
                        jQuery.where = QueryBuilder._parseCondition(jQuery.where, replacer);
                    }
                });
            }

            return tQuery;
        }

        if (isarray(serverQuery)) {
            return Object.reduce(function (accum, query) {
                accum.push(_parse(query));
                return accum;
            }, []);
        } else if (isobject(serverQuery)) {
            return this.parseValue(replacer)(JSON.stringify(serverQuery));
        }

        return _parse(serverQuery);
    }


    /**
     * 
     * @param {*} query 
     * @param {*} replacer 
     * @param {*} responseContext 
     * @returns 
     */
    static queryParser(query, replacer, responseContext) {
        replacer = replacer ? replacer : {};
        var parseValueFn = this.parseValue(replacer);
        if (typeof query == 'function')
            query = query(responseContext);

        return query.split(/\s+(?:-)/gi)
            .map(q => parseValueFn(q.trim()));
    }
}