class QueryLimitMethods {
    /**
     * @param {*} limit 
     * parse query limit
     */
    static parseLimit(limit) {
        if (isnumber(limit)) {
            return [0, limit];
        }

        var JDB_LIMITS = {
            "JDB_SINGLE": "0,1",
            "JDB_MAX": "0,100",
            "JDB_MIN": "0,50",
        };

        // check if JDB_LIMITS type was passed
        limit = JDB_LIMITS[limit] || limit;

        // check for FL char
        /**
         * check for FL char
         * F = irst
         * L = ast
         * 
         * eg (F50, L50)
         */
        var regex = /[FLfl]/;
        if (regex.test(limit)) {
            var t = limit.charAt(0).toUpperCase();
            var num = parseInt(limit.split(regex)[1], 10);
            return [t == 'L' ? -1 : 0, num];
        }

        var spltLimit = limit.split(',');
        return [parseInt(spltLimit[1] ? spltLimit[0] : '0'), parseInt(spltLimit[1] ? spltLimit[1] : spltLimit[0])];
    }

    /**
     * 
     * @param {*} data 
     * @param {*} definition 
     * @returns 
     */
    static limitTask(data, definition) {
        var limit = QueryLimitMethods.parseLimit(definition.limit);
        // L(n) limit type
        if (0 > limit[0]) {
            limit = [(data.length - limit[1]), data.length];
        }
        return data.splice(limit[0], limit[1]);
    }

    /**
     * 
     * @param {*} cData 
     * @param {*} definition 
     * @param {*} strict 
     * @returns 
     */
    static groupByTask(cData, definition, strict) {
        var _groupSplit = (definition.groupBy || definition.groupByStrict).split(',');
        var ret = cData.reduce(function (accum, item) {
            var cMatch = _groupSplit.map((key) => item[key]);
            var cMatch2 = cMatch.reverse().join(':');
            cMatch = cMatch.join(':');
            if (strict && !accum[cMatch] && accum[cMatch2]) {
                cMatch = cMatch2;
            }

            if (!accum[cMatch]) {
                accum[cMatch] = [];
            }

            accum[cMatch].push(item);
            return accum;
        }, {});

        // map through the ret and return the result
        return Object.values(ret).map(value => ((definition.limit) ? QueryLimitMethods.limitTask(value, definition) : value));
    }

    /**
     * 
     * @param {*} definition 
     * @param {*} cdata 
     * @returns 
     */
    static process(definition, cdata) {
        var staticMethods = {
            groupBy: (cdata, definition) => QueryLimitMethods.groupByTask(cdata, definition),
            groupByStrict: (cdata, definition) => QueryLimitMethods.groupByTask(cdata, definition, true),
            orderBy: (cdata, _, propertyName) => {
                var checkParam = (_[propertyName] || 'ASC').split(':')
                var order = checkParam.pop();
                /**
                 * sort option accepts multiple property
                 * split the properties into array
                 * as method params
                 */
                if (checkParam.length) {
                    cdata = _querySortPerformer.call(cdata, checkParam[0].split(','));
                }
                /**
                 * set reverse options if defined
                 * only when been used as filter options in expressions
                 */
                if (order === 'DESC') {
                    cdata.reverse();
                }

                return cdata;
            },
            limit: (cdata, definition) => ((!definition.groupBy && !definition.groupByStrict) ? QueryLimitMethods.limitTask(cdata, definition) : cdata)
        };

        cdata = Object.keys(staticMethods).reduce((accum, key) => ((definition[key]) ? staticMethods[key](accum, definition, key) : accum), cdata);
        return copy(cdata, true);
    }
}