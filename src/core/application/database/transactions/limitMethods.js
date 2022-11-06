var QueryLimitMethods = (function() {
    'use strict';

    /**
     * 
     * @param {*} data 
     * @param {*} definition 
     * @returns 
     */
    function limitTask(data, definition) {
        if (isnumber(definition.limit)) {
            definition.limit = definition.limit.toString();
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
        if (regex.test(definition.limit)) {
            var t = definition.limit.charAt(0).toUpperCase();
            var num = parseInt(definition.limit.split(regex)[1], 10);
            if (t == 'L') {
                definition.limit = (data.length - num) + ',' + data.length;
            } else if (t == 'F') {
                definition.limit = '0,' + num;
            }
        }

        var spltLimit = definition.limit.split(',');
        return data.splice(parseInt(spltLimit[1] ? spltLimit[0] : '0'), parseInt(spltLimit[1] ? spltLimit[1] : spltLimit[0]));
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
        var ret = cData.reduce(function(accum, item) {
            var cMatch = _groupSplit.map(function(key) { return item[key]; });
            var cMatch2 = cMatch.reverse().join(':');
            cMatch = cMatch.join(':');

            if (strict) {
                if (!accum[cMatch] && accum[cMatch2]) {
                    cMatch = cMatch2;
                }
            }

            if (!accum[cMatch]) {
                accum[cMatch] = [];
            }

            accum[cMatch].push(item);
            return accum;
        }, {});

        // map through the ret and return the result
        return Object.keys(ret).map(function(key) {
            if (definition.limit) {
                return limitTask(ret[key], definition);
            }
            return ret[key];
        });
    }

    /**
     * Query Limit methods
     */
    var staticMethods = {
        groupBy: function(cdata, definition) {
            return groupByTask(cdata, definition);
        },
        orderBy: function(cdata, _, propertyName) {
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
        limit: function(cdata, definition) {
            if (!definition.groupBy && !definition.groupByStrict) {
                return limitTask(cdata, definition);
            }
            return cdata;
        },
        groupByStrict: function(cdata, definition) {
            return groupByTask(cdata, definition, true);
        }
    };

    /**
     * 
     * @param {*} definition 
     * @param {*} cdata 
     * @returns 
     */
    return function(definition, cdata) {
        ['groupBy', 'groupByStrict', 'orderBy', 'limit'].forEach(function(key) {
            if (definition[key]) {
                cdata = staticMethods[key](cdata, definition, key);
            };
        });

        return JSON.parse(JSON.stringify(cdata));
    };
})();