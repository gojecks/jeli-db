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
     * @param {*} definition 
     * @param {*} cdata 
     * @returns 
     */
    static process(definition, cdata) {
        var staticMethods = {
            orderBy: (result) => {
                var orderByFields = definition.orderBy.split(',').map(i => i.split(':'));
                return result.sort((a, b) => {
                    for (const field of orderByFields) {
                        const key = field[0];
                        const order = field[1] || 'asc';
                        const direction = order.toLowerCase() === 'desc' ? -1 : 1;
                        const aValue = modelGetter(key, a);
                        const bValue = modelGetter(key, b);
                        if (aValue < bValue) return -1 * direction;
                        if (aValue > bValue) return 1 * direction;
                    }
                    return 0; // If equal, continue to the next field
                });
            },
            limit: (cdata) => QueryLimitMethods.limitTask(cdata, definition)
        };

        cdata = Object.keys(staticMethods).reduce((accum, key) => ((definition[key]) ? staticMethods[key](accum) : accum), cdata);
        return copy(cdata, true);
    }
}