var QueryLimitMethods = (function () {
    'use strict';

    /**
     * @param {*} limit 
     * parse query limit
     */
    function parseLimit(limit) {
        if (isnumber(limit)) {
            return [0, limit];
        }

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
    function limitTask(data, definition) {
        var limit = parseLimit(definition.limit);
        // L(n) limit type
        if (0 > limit[0]){
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
    function groupByTask(cData, definition, strict) {
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
        return Object.values(ret).map(function (value) {
            if (definition.limit) {
                return limitTask(value, definition);
            }
            return value;
        });
    }

    /**
     * Query Limit methods
     */
    var staticMethods = {
        groupBy: function (cdata, definition) {
            return groupByTask(cdata, definition);
        },
        orderBy: function (cdata, _, propertyName) {
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
        limit: function (cdata, definition) {
            if (!definition.groupBy && !definition.groupByStrict) {
                return limitTask(cdata, definition);
            }
            return cdata;
        },
        groupByStrict: function (cdata, definition) {
            return groupByTask(cdata, definition, true);
        }
    };

    /**
     * 
     * @param {*} definition 
     * @param {*} cdata 
     * @returns 
     */
    return {
        parseLimit,
        process: function (definition, cdata) {
            ['groupBy', 'groupByStrict', 'orderBy', 'limit'].forEach(function (key) {
                if (definition[key]) {
                    cdata = staticMethods[key](cdata, definition, key);
                };
            });
    
            return copy(cdata, true);
        }
    };
})();