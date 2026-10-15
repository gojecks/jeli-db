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
            const exec = /\%(.*?)\%/.exec(entry);
            if (!exec) return entry;
            // straight match
            if (exec && exec.input == exec[0]) {
                return modelGetter(exec[1], replacer);
            }

            entry = entry.replace(/\%(.*?)\%/g, function (_, key) {
                const value = modelGetter(key, replacer);
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
        const parseValueFn = this.parseValue(replacer);
        if (typeof query == 'function')
            query = query(responseContext);

        return query.split(/\s+(?:-)/gi)
            .map(q => parseValueFn(q.trim()));
    }

    /**
     * V2 syntax splitter: `command --name=value --flag`, quote/brace-depth
     * aware so a dash inside JSON data or a quoted string is never mistaken
     * for a `--flag` boundary. Only a literal `--` immediately followed by a
     * letter, at depth 0 and outside quotes, starts a new token -- that's
     * also what makes a V1 query ("-value -value") safely fall through this
     * unchanged as a single token (see isV2Query).
     * @param {*} str
     */
    static tokenizeV2(str) {
        const tokens = [];
        let depth = 0, quote = null, buf = '';
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (quote) {
                buf += c;
                if (c === quote && str[i - 1] !== '\\') quote = null;
            } else if (c === '"' || c === "'") {
                quote = c;
                buf += c;
            } else if ('{['.includes(c)) {
                depth++;
                buf += c;
            } else if ('}]'.includes(c)) {
                depth--;
                buf += c;
            } else if (depth === 0 && str.startsWith('--', i) && /[A-Za-z]/.test(str[i + 2] || '')) {
                if (buf.trim()) tokens.push(buf.trim());
                buf = '';
                i++; // consume both dashes
            } else {
                buf += c;
            }
        }

        if (buf.trim()) tokens.push(buf.trim());
        return tokens;
    }

    /**
     * @param {*} query
     */
    static isV2Query(query) {
        return typeof query == 'string' && this.tokenizeV2(query).length > 1;
    }

    /**
     * Parses a V2 query into { command, flags }, where flags is a map of
     * flagName -> value (true for a bare `--flag`, otherwise the parsed
     * value after `=`, run through the same %key% replacer/JSON parsing as
     * V1 values).
     * @param {*} query
     * @param {*} replacer
     */
    static parseV2(query, replacer) {
        const parseValueFn = this.parseValue(replacer || {});
        const tokens = this.tokenizeV2(query);
        const flags = tokens.slice(1).reduce((accum, token) => {
            const eq = token.indexOf('=');
            if (eq === -1) {
                accum[token.trim()] = true;
            } else {
                accum[token.slice(0, eq).trim()] = parseValueFn(token.slice(eq + 1).trim());
            }
            return accum;
        }, {});

        return { command: tokens[0], flags };
    }
}