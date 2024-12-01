class SelectHelpers {
    static cachedFields = new Map();
    static getStrAtPos(value, start, end) {
        return (value || '').substr(start, end);
    }

    static getNumberOnlyValues(field, queryResult) {
        return queryResult.reduce(function (accum, item) {
            if (item && item.hasOwnProperty(field) && isnumber(item[field])) {
                return accum.concat(item[field]);
            }
        }, []);
    }

    static replacer(str) {
        return (str || '').replace(/\((.*?)\)/, "|$1").split("|");
    }

    /**
     * Generate column required column for mapping
     */
    static parseFields(fields) {
        var requiredFields = SelectHelpers.cachedFields.get(fields);
        if (!requiredFields && fields) {
            requiredFields = fields.split(',').map(function (select) {
                var aCol = SelectHelpers.replacer(select);
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
                    custom: SelectHelpers.replacer(select.split(" as ")[0].trim()),
                    field: field,
                    tCol: tCol,
                    asx: (field === '*' && isequal(_as, field))
                };
            });

            // store the field to cache
            SelectHelpers.cachedFields.set(fields, requiredFields);
        }

        return requiredFields;
    }
}

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

class SelectMethods {
    static COUNT(_, field, queryResult) {
        if (field) {
            return queryResult.filter(function (item) { return item[field]; }).length;
        }
        return queryResult.length
    }

    static LOWERCASE(cdata, field) {
        return cdata[field].toLowerCase();
    }

    static UPPERCASE(cdata, field) {
        return cdata[field].toUpperCase();
    }

    static CURDATE() {
        return new Date().toLocaleDateString();
    }

    static CURDATETIME() {
        return new Date().toLocaleString();
    }

    static TIMESTAMP(cdata, field) {
        var timestamp = +new Date(cdata[field]);
        if (!isNaN(timestamp)) return timestamp;
        return null;
    }

    static DATE_DIFF(cdata, field) {
        var dates = field.split(':');
        var today = +new Date;
        return (+new Date(cdata[dates[0]] || today)) - (+new Date(cdata[dates[1]] || today));
    }

    static DATE_IN_FUTURE(data, field){
        return (+new Date(SelectMethods.GET(data, field) || '') > Date.now());
    }

    static CASE(cdata, field) {
        return maskedEval(field.replace(/when/gi, '(').replace(/then/gi, ') ?').replace(/else/gi, ':').trim(), cdata);
    }

    static GET(cdata, field) {
        return modelGetter(field, cdata);
    }

    static MIN(_, field, queryResult) {
        var values = getNumberOnlyValues(field, queryResult);
        return Math.min.apply(Math, values);
    }

    static MAX(_, field, queryResult) {
        var values = getNumberOnlyValues(field, queryResult);
        return Math.max.apply(Math, values);
    }

    static SUM(_, field, queryResult) {
        var values = getNumberOnlyValues(field, queryResult);
        return values.reduce(function (a, b) {
            return a + b;
        }, 0);
    }

    static AVG(cdata, field, queryResult) {
        return this.SUM(cdata, field) / queryResult.length;
    }

    static DIV(cdata, fields) {
        var divisionFields = fields.split(':').map(trim);
        return (cdata[divisionFields[0]] || 0) / (cdata[divisionFields[1]] || 0);
    }

    static REVERSE(cdata, field) {
        return (cdata[field] || '').split('').reverse().join('');
    }

    static LENGTH(cdata, field) {
        return (cdata[field] || '').length;
    }

    static CONCAT(cdata, values) {
        return values.replace(/\${(.*?)\}/gi, function (match, key) {
            var val = modelGetter(key, cdata);
            return (val !== null && val !== undefined) ? val : '';
        });
    }

    static RIGHT(cdata, values) {
        values = values.split(':');
        var len = parseInt(values[1]),
            content = (cdata[values[0]] || '');
        return getStrAtPos(content, (content.length - len++), len);
    }

    static LEFT(cdata, values) {
        values = values.split(':');
        var len = parseInt(values[1]),
            content = (cdata[values[0]] || '');
        return getStrAtPos(content, 0, len);
    }

    static INSTR(cdata, fields) {
        fields = fields.split(':');
        return (cdata[fields[0]] || '').indexOf(fields[1]);
    }

    static TRIM(cdata, field) {
        return (cdata[field] || '').trim();
    }

    static SUBSTR(cdata, values) {
        values = values.split(':');
        return getStrAtPos(cdata[values[0]], parseInt(values[1]), parseInt(values[2]));
    }
}

class ValueMethods {
    static instance = new ValueMethods('');
    static writeToContext(resolveAs, resObject, thenValue) {
        deepArrayChecker(true, resolveAs, resObject, thenValue);
    }

    static callMethod(field, data) {
        var expr = SelectHelpers.replacer(field);
        if (expr[1] && SelectMethods[expr[0]]) {
            return SelectMethods[expr[0]](data, expr[1]);
        }

        return expr[0];
    }

    static createInstance(fields, queryResult){
        return new this(fields, queryResult);
    }
    
    constructor(fields, queryResult) {
        this.requiredFields = null;
        this.queryResult = queryResult || [];

        this.setField = function(fields) {
            this.requiredFields = SelectHelpers.parseFields(fields);
            return this;
        };
    
        this.setData = function(data) {
            this.queryResult = data;
            return this;
        };

        // set the fields
        this.setField(fields);
    }

    /**
     * 
     * @param {*} field 
     * @param {*} cdata 
     * @returns 
     */
    getValue(field, cdata) {
        var selectFn = SelectMethods[field[0]];
        if (typeof selectFn == 'function' && !cdata.hasOwnProperty(field[0])) {
            return selectFn(cdata, field[1], this.queryResult);
        }

        return SelectMethods.GET(cdata, field[0]);
    }

    first() {
        return this.getData(this.queryResult[0]);
    }

    /**
     * 
     * @param {*} cData 
     * @returns selectedField values
     */
    getData(cData) {
        // return the data if field is undefined
        if (!this.requiredFields) return cData;

        var odata = {};
        for (var field of this.requiredFields) {
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
    }

    getAll(customOnly) {
        return this.queryResult.reduce((accum, item) => {
            if (customOnly){
                var value = this.getValue(this.requiredFields[0].custom, item);
                if (Array.isArray(value)) 
                    accum.push.apply(accum, value);
                else 
                    accum.push(value); 
            } else {
                accum.push(this.getData(item)); 
            }
            
            return accum;
        }, []);
    }
}