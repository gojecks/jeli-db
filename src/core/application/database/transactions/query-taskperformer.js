class QueryTaskPerformer {
    static cachedLogics = new Map();
    static sort(data, sortArguments) {
        if (isarray(data)) {
            return data.sort(function (obj1, obj2) {
                /*
                 * save the arguments object as it will be overwritten
                 * note that arguments object is an array-like object
                 * consisting of the names of the properties to sort by
                 */
                var i = 0,
                    result = 0,
                    numberOfProperties = sortArguments.length;
                /* try getting a different result from 0 (equal)
                 * as long as we have extra properties to compare
                 */
                while (result === 0 && i < numberOfProperties) {
                    result = compare(sortArguments[i], obj1, obj2);
                    i++;
                }

                return result;
            });
        }

        function compare(property, a, b) {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * 1;
        }

        return data;
    }

    /**
     * 
     * @param {*} data 
     * @param {*} logic 
     * @param {*} callback 
     * @param {*} limit 
     * @returns 
     */
    static run(data, logic, callback, limit) {
        /**
         * return data when logic is undefined
         */
        var searchResult = [];
        var logicPerformer = this.externalQuery(logic);
        callback = callback || function (item) {
            searchResult.push(item._data || item);
        };
        //Query the required Data
        //Match the Result with Logic
        //@return : ARRAY Search result
        var len = 0;
        var matchFound = 0;
        while (data.length > len) {
            if (limit && matchFound == limit)
                return searchResult;

            if (logicPerformer(data[len], len)) {
                matchFound++;
                callback(data[len], len);
            }
            len++;
        }

        return searchResult;
    }

    /**
     * 
     * @param {*} logic 
     * @param {*} replacer 
     * @returns 
     */
    static externalQuery(logic, replacer) {
        function objectQueryTaskPerformer(item) {
            if (logic.byRefs) {
                return logic.byRefs.includes(item._ref);
            }

            //Loop through the logic
            //match found item
            var conditionValue = item._data || item;
            var checkConditions = function (condition) {
                for (var key in condition) {
                    if (!QueryTaskPerformer.match(condition[key], modelGetter(key, conditionValue), conditionValue))
                        return false;
                }

                return true;
            };

            return logic.some(checkConditions);
        }

        if (logic) {
            if (isstring(logic)) {
                if (!this.cachedLogics.has(logic)) {
                    this.cachedLogics.set(logic, QueryBuilder._parseCondition(logic, replacer));
                }

                logic = this.cachedLogics.get(logic);
            }
            /**
             * user defined logic as object
             * convert to array
             */
            else if (isobject(logic) && !logic.byRefs) {
                logic = [logic];
            }
            // create or expect instance
            return objectQueryTaskPerformer;
        }

        // fallback if no logic found
        return function () {
            return true;
        }
    }

    /**
     * 
     * @param {*} $query 
     * @param {*} fieldValue 
     * @param {*} item 
     * @returns 
     */
    static match($query, fieldValue, item) {
        if (isobject($query)) {
            var recordValue = modelGetter($query.value, item) || $query.value;
            return OperatorMethod._call($query.type, fieldValue, recordValue);
        } else if (isobject(fieldValue)) {
            return jsonMatcher($query, fieldValue);
        }

        return $query == fieldValue;
    }

    /**
     * 
     * @param {*} record 
     * @param {*} expressions
     */
    static performOperations(record, expressions) {
        var operations = {
            /**
             * @param {*} arr 
             * @param {*} exp
             * exp.value
             * exp.key 
             */
            ins: (arr, exp) => {
                if(!Array.isArray(arr)){
                    arr = [];
                    modelSetter(exp.key, record, arr);
                }
                arr.push.apply(arr, exp.value || []);
            },
            /**
             * @param {*} arr 
             * @param {*} exp 
             * exp.conditions
             * exp.key
             */
            del: (arr, exp) => {
                if (Array.isArray(arr)) {
                    var executor = this.externalQuery(exp.conditions);
                    var len = arr.length;
                    while(len--){
                        if (executor(arr[len])){
                            arr.splice(len, 1);
                        }
                    }
                }
            },
            /**
             * @param {*} arr 
             * @param {*} exp 
             * exp.conditions
             * exp.value
             * exp.key
             */
            upd: (arr, exp) => {
                if (Array.isArray(arr)) {
                    var executor = this.externalQuery(exp.conditions);
                    var len = arr.length;
                    while(len--){
                        if (executor(arr[len])){
                            Object.assign(arr[len], exp.value);
                        }
                    }
                }
            }
        };

        for(var exp of expressions){
            if (exp && operations[exp.op]) {
                var arr =  modelGetter(exp.key, record);
                operations[exp.op](arr, exp);
            }
        }
    }

    static extend() {
        var extended = {};
        var deep = isboolean(arguments[0]);
        var i = 0;
        var length = arguments.length;

        if (deep) {
            i++;
            deep = arguments[0];
        }

        // check if source is Array or Object
        if (isarray(arguments[i]) && !isobject(arguments[i + 1])) {
            extended = Array(arguments[i].length);
        }



        var merger = (source) => {
            for (var name in source) {
                if (source.hasOwnProperty(name)) {
                    if (name == '$exp') {
                        this.performOperations(extended, source[name]);
                    } else if (deep && isobject(source[name]) && !isemptyobject(source[name])) {
                        extended[name] = this.extend(true, extended[name], source[name]);
                    } else {
                        //set the value
                        extended[name] = source[name];
                    }
                }
            }
        };

        // Loop through each object and conduct a merge
        for (; i < length; i++) {
            merger(arguments[i]);
        }

        return extended;
    }
}