//get table column
function transactionSelectColumn(data, definition) {
    //set the data to get column info from
    var fields = (definition.fields || definition.select || ""),
        columns = fields.split(','),
        retData = [],
        requiredFields = [],
        data = getTableData(),
        $self = this,
        replacer = function(str) {
            return str.replace(/\((.*?)\)/, "|$1").split("|");
        };

    /**
     * 
     * @param {*} cdata 
     */
    function performOrderLimitTask(cdata) {
        var actions = {
            groupBy: function() {
                cdata = groupByTask(cdata);
            },
            orderBy: function(propertyName) {
                var _queryApi = new $query(cdata),
                    newList,
                    order = 'ASC';

                /**
                 * set reverse options if defined
                 * only when been used as filter options in expressions
                 */
                if ($inArray(':', propertyName)) {
                    order = propertyName.split(":")[1].trim();
                }

                /**
                 * sort option accepts multiple property
                 * split the properties into array
                 * as method params
                 */
                newList = _queryApi.sortBy.apply(_queryApi, propertyName.split(":")[0].split(","));
                if (order === 'DESC') {
                    newList.reverse();
                }
                return newList;
            },
            limit: function() {
                if (!definition.groupBy && !definition.groupByStrict) {
                    cdata = limitTask(cdata);
                }
            },
            groupByStrict: function() {
                cdata = groupByTask(cdata, true);
            }
        };


        Object.keys(actions).forEach(function(key) {
            if (definition[key]) {
                actions[key](definition[key]);
            };
        });

        return JSON.parse(JSON.stringify(cdata));
    }

    function limitTask(data) {
        if ($isNumber(definition.limit)) {
            definition.limit = "0," + definition.limit;
        }
        var spltLimit = definition.limit.split(',');
        return data.splice(parseInt(spltLimit[0]), parseInt(spltLimit[1]));
    }


    function groupByTask(cData, strict) {
        var ret = {},
            _groupSplit = (definition.groupBy || definition.groupByStrict).split(",");
        cData.forEach(function(item) {
            var cMatch = _groupSplit.map(function(key) {
                    return item[key];
                }).join(":"),
                cMatch2 = cMatch.split(":").reverse().join(":");

            if (strict) {
                if (!ret[cMatch] && ret[cMatch2]) {
                    cMatch = cMatch2;
                }
            }

            if (!ret[cMatch]) {
                ret[cMatch] = [];
            }

            ret[cMatch].push(item);
        });

        // map through the ret and return the result
        cData = Object.keys(ret).map(function(key) {
            if (definition.limit) {
                return limitTask(ret[key]);
            }
            return ret[key];
        });

        ret = null;

        return cData;
    }

    function getNumberOnlyValues(field) {
        var values = [];
        data.forEach(function(item) {
            if (item.hasOwnProperty(field) && typeof item[field] === 'number') {
                values.push(item[field]);
            }
        });

        return values;
    }

    /**
     * 
     * @param {*} value 
     * @param {*} start 
     * @param {*} end 
     */
    function getStrAtPos(value, start, end) {
        return (value || '').substr(start, end);
    }


    /**
        JDB Private FIELD VALUES
        -#COUNT()
            returns length of search result
        -#LOWERCASE(field)
            returns a field value to lowercase
        -#UPPERCASE(field)
            returns a field value to uppercase
        -CURDATE()
            returns current timestamp
        -TIMESTAMP(FIELD)
            returns converted value of field to timestamp
        -DATE_DIFF(field1, field2)
            returns difference between 2 DATE
        - CASE( WHEN COLUMN = CONDITION THEN COLUMN2 ELSE WHEN COLUMN2 = CONDITION THEN COLUMN ELSE NULL)
          return RESULT
        -GET(FIELD)
          return FIELD_VALUE
    **/

    var _privateApi = {
        COUNT: function(cdata, field) {
            if (field) {
                return data.filter(function(item) { return item[field]; }).length;
            }
            return data.length
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
            return new Date(cdata[field]).getTime();
        },
        DATE_DIFF: function(cdata, field) {
            var dates = field.split(':');
            return new Date(cdata[dates[0]] || +new Date).getTime() - new Date(cdata[dates[1]] || +new Date).getTime();
        },
        CASE: function(cdata, field) {
            return maskedEval(field.replace(new RegExp("when", "gi"), "").replace(new RegExp("then", "gi"), "?").replace(new RegExp("else", "gi"), ":"), cdata);
        },
        GET: function(cdata, field) {
            return ModelSetterGetter(field, cdata);
        },
        MIN: function(cdata, field) {
            var values = getNumberOnlyValues(field);
            return Math.min.apply(Math, values);
        },
        MAX: function(cdata, field) {
            var values = getNumberOnlyValues(field);
            return Math.max.apply(Math, values);
        },
        SUM: function(cdata, field) {
            var values = getNumberOnlyValues(field);
            return values.reduce(function(a, b) {
                return a + b;
            }, 0);
        },
        AVG: function(cdata, field) {
            return this.SUM(cdata, field) / data.length;
        },
        DIV: function(cdata, fields) {
            var divisionFields = fields.split(":");
            return (cdata[divisionFields[0]] || 0) / (cdata[divisionFields[1]] || 0);
        },
        REVERSE: function(cdata, field) {
            return (cdata[field] || '').split("").reverse().join("");
        },
        LENGTH: function(cdata, field) {
            return (cdata[field] || '').length;
        },
        CONCAT: function(cdata, values) {
            return values.replace(/\${(.*?)\}/gi, function(match, key) {
                return cdata[key] || key;
            });
        },
        RIGHT: function(cdata, values) {
            values = values.split(":");
            var len = parseInt(values[1]),
                content = (cdata[values[0]] || '');
            return getStrAtPos(content, (content.length - len++), len);
        },
        LEFT: function(cdata, values) {
            values = values.split(":");
            var len = parseInt(values[1]),
                content = (cdata[values[0]] || '');
            return getStrAtPos(content, 0, len);
        },
        INSTR: function(cdata, fields) {
            fields = fields.split(":");
            return (cdata[fields[0]] || '').indexOf(fields[1]);
        },
        TRIM: function(cdata, field) {
            return (cdata[field] || '').trim();
        },
        SUBSTR: function(cdata, values) {
            values = values.split(":");
            return getStrAtPos(cdata[values[0]], parseInt(values[1]), parseInt(values[2]));
        }
    };

    function _custom(field) {
        field = replacer(field);
        return function(cdata) {
            if (_privateApi[field[0]] && !cdata.hasOwnProperty(field[0])) {
                return _privateApi[field[0]](cdata, field[1])
            }

            return _privateApi.GET(cdata, field[0]);
        };
    }

    /**
     * Generate column required column for mapping
     */
    function buildColumn() {
        columns.forEach(function(select) {
            var aCol = replacer(select);
            aCol = aCol[1] || aCol[0];

            var fieldName = aCol.split(' as '),
                tCol;
            //if fieldName contains table name
            if ($inArray('.', aCol)) {
                var spltCol = aCol.split(".");
                tCol = spltCol.shift().trim();
                // split our required column on ' as '
                fieldName = spltCol.join('.').split(' as ');
                //AS Clause is required 
                // if ($inArray(' as ', aCol)) {
                //     tCol = false;
                // }
            }

            // remove whiteSpace from our fieldName
            fieldName = JSON.parse(JSON.stringify(fieldName).trim());
            var _as = fieldName.pop().trim(),
                field = fieldName.length ? fieldName.shift() : _as,
                rCol = null;

            if (field === '*' && $isEqual(_as, field)) {
                rCol = Object.keys(data[0][tCol]);
            }

            requiredFields.push({
                _as: _as,
                custom: _custom(select.split(" as ")[0].trim()),
                field: field,
                tCol: tCol,
                rCol: rCol
            });
        });
    }


    //Function getTbale data
    function getTableData() {
        //return data when its defined
        if ($isArray(data)) {
            return data;
        }

        return $self.getTableInfo(data) || [];
    }



    //set the object to be returned
    function setColumnData(cData) {
        var odata = {};
        //set the data
        requiredFields.forEach(function(_curField) {
            if ($isEqual(_curField.field, '*')) {
                resolveAsterixQuery(_curField);
            } else {
                odata[_curField._as] = _curField.custom(cData);
            }
        });

        function resolveAsterixQuery(curField) {
            if (curField.rCol) {
                curField.rCol.forEach(function(field) {
                    odata[field] = cData[curField.tCol][field];
                });
            } else {
                odata[_curField._as] = cData[curField.tCol] || cData;
            }
        }

        retData.push(odata);
    }

    /**
     * COUNT, MIN, MAX
     */
    function hasSingleResultQuery() {
        return ['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].filter(function(key) {
            return $inArray(key, fields);
        }).length > 0;
    }

    function resolveData() {
        if (!definition.isArrayResult) {
            buildColumn();
            /**
             * check for COUNT fields
             */
            if (hasSingleResultQuery()) {
                setColumnData(data[0], 0);
            } else {
                data.forEach(setColumnData);
            }
        } else {
            /**
             * return the field that matches the result
             */
            retData = data.map(function(item) {
                return item[fields];
            });
        }
    }

    /**
     * loop through the data
     * return the required column
     */
    if (fields && !$isEqual(fields, '*')) {
        resolveData();
    } else {
        retData = data.splice(0);
    }

    //return the data
    return performOrderLimitTask(retData);
};