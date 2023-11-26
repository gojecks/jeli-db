/**
 * JDB Private FIELD VALUES
 * -#COUNT()
 *  returns length of search result
 * -#LOWERCASE(field)
 *  returns a field value to lowercase
 * -#UPPERCASE(field)
 *     returns a field value to uppercase
 * -CURDATE()
 *     returns current timestamp
 * -TIMESTAMP(FIELD)
 *     returns converted value of field to timestamp
 * -DATE_DIFF(field1, field2)
 *     returns difference between 2 DATE
 * -CASE( WHEN COLUMN = CONDITION THEN COLUMN2 ELSE WHEN COLUMN2 = CONDITION THEN COLUMN ELSE NULL)
 *   return RESULT
 * -GET(FIELD)
 *   return FIELD_VALUE
 */
var ValueMethods = (function() {
    'uee strict';
    /**
     * 
     * @param {*} value 
     * @param {*} start 
     * @param {*} end 
     */
    function getStrAtPos(value, start, end) {
        return (value || '').substr(start, end);
    }

    function getNumberOnlyValues(field, queryResult) {
        return queryResult.reduce(function(accum, item) {
            if (item && item.hasOwnProperty(field) && isnumber(item[field])) {
                return accum.concat(item[field]);
            }
        }, []);
    }

    function replacer(str) {
        return str.replace(/\((.*?)\)/, "|$1").split("|");
    }

    var SelectMethods = {
        COUNT: function(_, field, queryResult) {
            if (field) {
                return queryResult.filter(function(item) { return item[field]; }).length;
            }
            return queryResult.length
        },
        LOWERCASE: function(cdata, field) {
            return cdata[field].toLowerCase();
        },
        UPPERCASE: function(cdata, field) {
            return cdata[field].toUpperCase();
        },
        CURDATE: function() {
            return new Date().toLocaleDateString();
        },
        CURDATETIME: function() {
            return new Date().toLocaleString();
        },
        TIMESTAMP: function(cdata, field) {
            var timestamp = +new Date(cdata[field]);
            if (!isNaN(timestamp)) return timestamp;
            return null;
        },
        DATE_DIFF: function(cdata, field) {
            var dates = field.split(':');
            var today = +new Date;
            return (+new Date(cdata[dates[0]] || today)) - (+new Date(cdata[dates[1]] || today));
        },
        CASE: function(cdata, field) {
            return maskedEval(field.replace(/when/gi, '(').replace(/then/gi, ') ?').replace(/else/gi, ':').trim(), cdata);
        },
        GET: function(cdata, field) {
            return modelGetter(field, cdata);
        },
        MIN: function(_, field, queryResult) {
            var values = getNumberOnlyValues(field, queryResult);
            return Math.min.apply(Math, values);
        },
        MAX: function(_, field, queryResult) {
            var values = getNumberOnlyValues(field, queryResult);
            return Math.max.apply(Math, values);
        },
        SUM: function(_, field, queryResult) {
            var values = getNumberOnlyValues(field, queryResult);
            return values.reduce(function(a, b) {
                return a + b;
            }, 0);
        },
        AVG: function(cdata, field, queryResult) {
            return this.SUM(cdata, field) / queryResult.length;
        },
        DIV: function(cdata, fields) {
            var divisionFields = fields.split(':').map(trim);
            return (cdata[divisionFields[0]] || 0) / (cdata[divisionFields[1]] || 0);
        },
        REVERSE: function(cdata, field) {
            return (cdata[field] || '').split('').reverse().join('');
        },
        LENGTH: function(cdata, field) {
            return (cdata[field] || '').length;
        },
        CONCAT: function(cdata, values) {
            return values.replace(/\${(.*?)\}/gi, function(match, key) {
                var val = modelGetter(key, cdata);
                return (val !== null && val !== undefined) ? val : '';
            });
        },
        RIGHT: function(cdata, values) {
            values = values.split(':');
            var len = parseInt(values[1]),
                content = (cdata[values[0]] || '');
            return getStrAtPos(content, (content.length - len++), len);
        },
        LEFT: function(cdata, values) {
            values = values.split(':');
            var len = parseInt(values[1]),
                content = (cdata[values[0]] || '');
            return getStrAtPos(content, 0, len);
        },
        INSTR: function(cdata, fields) {
            fields = fields.split(':');
            return (cdata[fields[0]] || '').indexOf(fields[1]);
        },
        TRIM: function(cdata, field) {
            return (cdata[field] || '').trim();
        },
        SUBSTR: function(cdata, values) {
            values = values.split(':');
            return getStrAtPos(cdata[values[0]], parseInt(values[1]), parseInt(values[2]));
        }
    };

    var cachedFields = new Map();

    /**
     * Generate column required column for mapping
     */
    function parseFields(fields) {
        var requiredFields = cachedFields.get(fields);
        if (!requiredFields) {
            requiredFields = fields.split(',').map(function(select) {
                var aCol = replacer(select);
                aCol = aCol[1] || aCol[0];

                var fieldName = aCol.split(' as ').map(trim),
                    tCol;
                //if fieldName contains table name
                if (inarray('.', aCol)) {
                    var spltCol = aCol.split(".").map(trim);
                    tCol = spltCol.shift();
                    // split our required column on ' as '
                    fieldName = spltCol.join('.').split(' as ');
                }

                // remove whiteSpace from our fieldName
                fieldName = JSON.parse(JSON.stringify(fieldName));
                var _as = fieldName.pop();
                var field = fieldName.length ? fieldName.shift() : _as;

                return {
                    _as: _as,
                    custom: replacer(select.split(" as ")[0].trim()),
                    field: field,
                    tCol: tCol,
                    asx: (field === '*' && isequal(_as, field))
                };
            });

            // store the field to cache
            cachedFields.set(fields, requiredFields);
        }

        return requiredFields;
    }

    /**
     * 
     * @param {*} fields 
     * @param {*} queryResult 
     */
    function ValueMethodsApis(fields, queryResult) {
        var requiredFields = parseFields(fields);
        queryResult = queryResult || [];
        /**
         * 
         * @param {*} field 
         * @param {*} cdata 
         * @returns 
         */
        this.getValue = function(field, cdata) {
            if (SelectMethods[field[0]] && !cdata.hasOwnProperty(field[0])) {
                return SelectMethods[field[0]](cdata, field[1], queryResult);
            }

            return SelectMethods.GET(cdata, field[0]);
        };

        this.first = function() {
            return this.getData(queryResult[0]);
        };

        /**
         * 
         * @param {*} cData 
         * @returns selectedField values
         */
        this.getData = function(cData) {
            var odata = {};
            //set the data
            for(var field of requiredFields) {
                if (isequal(field.field, '*')) {
                    resolveAsterixQuery(field);
                } else {
                    odata[field._as] = this.getValue(field.custom, cData);
                }
            }

            function resolveAsterixQuery(curField) {
                if (curField.asx) {
                    Object.assign(odata, cData[curField.tCol]);
                } else {
                    odata[curField._as] = cData[curField.tCol] || cData;
                }
            }

            return odata;
        };

        this.getAll = function(customOnly) {
            return queryResult.map(item => {
                if (customOnly) {
                    return this.getValue(requiredFields[0].custom, item);
                }
                return this.getData(item);
            });
        };

        this.setField = function(fields) {
            requiredFields = parseFields(fields);
            return this;
        };

        this.setData = function(data) {
            queryResult = data;
            return this;
        };
    }

    ValueMethodsApis.staticInstance = new ValueMethodsApis('');
    ValueMethodsApis.writeToContext = function(resolveAs, resObject, thenValue) {
        deepArrayChecker(true, resolveAs, resObject, thenValue);
    };
    ValueMethodsApis.callMethod = function(field, data){
        var expr = replacer(field);
        if (expr[1] && SelectMethods[expr[0]]){
            return SelectMethods[expr[0]](data, expr[1]);
        }

        return expr[0];
    };


    return ValueMethodsApis;
})();