//get table column
function transactionSelectColumn(data, definition) {
    //set the data to get column info from
    var columns = (definition.fields || "").split(','),
        retData = [],
        requiredFields = [],
        data = getTableData(),
        $self = this,
        replacer = function(str) {
            return str.replace(/\((.*?)\)/, "|$1").split("|");
        };
    /**
        @perFormLimitTask
        -Task
            :GROUPBY
            :orderBy
            :limit
    **/

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
                    order = $removeWhiteSpace(propertyName.split(":")[1]);
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

        Object.keys(actions).map(function(key) {
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
        COUNT: function(cdata) {
            return cdata.length
        },
        LOWERCASE: function(cdata, field) {
            return cdata[field].toLowerCase();
        },
        UPPERCASE: function(cdata, field) {
            return cdata[field].toUpperCase();
        },
        CURDATE: function() {
            return new Date().toLocaleString();
        },
        TIMESTAMP: function(cdata, field) {
            return new Date(cdata[field]).getTime();
        },
        DATE_DIFF: function(cdata, field) {
            return new Date(cdata[field.split(',')[0]]) - new Date(cdata[field.split(',')[1]]);
        },
        CASE: function(cdata, field) {
            return maskedEval(field.replace(new RegExp("when", "gi"), "").replace(new RegExp("then", "gi"), "?").replace(new RegExp("else", "gi"), ":"), cdata);
        },
        GET: function(cdata, field) {
            return ModelSetterGetter(field, cdata);
        }
    };

    function _custom(field) {
        field = replacer(field);
        return function(cdata) {
            return ((_privateApi[field[0]] && !cdata.hasOwnProperty(field[0])) ? _privateApi[field[0]](cdata, field[1]) : _privateApi.GET(cdata, field[0]));
        };
    }

    //loop through the data
    //return the required column
    if (!$isEqual(definition.fields, '*') && definition.fields) {
        buildColumn();
        data.forEach(setColumnData);
    } else {
        return performOrderLimitTask(data);
    }

    /**
     * Generate column required column for mapping
     */
    function buildColumn() {
        var _cLen = columns.length;
        while (_cLen--) {
            var aCol = replacer(columns[_cLen]);
            aCol = aCol[1] || aCol[0];

            var
                fieldName = aCol.split(' as '),
                tCol;


            //if fieldName contains table name
            if ($inArray('.', aCol)) {
                var spltCol = aCol.split(".");
                tCol = $removeWhiteSpace(spltCol.shift());
                // split our required column on ' as '
                fieldName = spltCol.join('.').split(' as ');
                //AS Clause is required 
                if ($inArray(' as ', aCol)) {
                    tCol = false;
                }
            }

            // remove whiteSpace from our fieldName
            fieldName = JSON.parse($removeWhiteSpace(JSON.stringify(fieldName)));

            var
                _as = fieldName.pop(),
                field = fieldName.length ? fieldName.shift() : _as;

            requiredFields.push({
                _as: _as,
                custom: _custom($removeWhiteSpace(columns[_cLen].split(" as ")[0])),
                field: field,
                tCol: tCol
            });
        }
    }


    //Function getTbale data
    function getTableData() {
        //return data when its defined
        if ($isArray(data)) {
            return data;
        } else if ($self.tableInfo.data) //return data when single table search
        {
            return $self.tableInfo.data;
        } else if ($isString(data)) {
            return $self.tableInfo[data].data;
        }

        return [];
    }



    //set the object to be returned
    function setColumnData(cData) {
        var odata = {},
            fnd = 0,
            len = requiredFields.length;


        //set the data
        while (len > fnd) {
            var _curField = requiredFields[fnd];
            if ($isEqual(_curField.field, '*')) {
                odata[_curField.tCol] = cData[_curField.tCol] || cData;
            } else {
                odata[_curField._as] = _curField.custom(cData);
            }

            fnd++;
        }

        retData.push(odata);
    }

    //return the data

    return performOrderLimitTask(retData);
};