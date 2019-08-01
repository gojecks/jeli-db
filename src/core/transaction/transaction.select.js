/**
 *   #Transaction.select(selectFields, [definition])
 *   @params selectFields {STRING}
 *   @params definition {OBJECT}
 *     Perform query on selected Table and return the Data that matches the query
 *     -query : select -* -TBL_NAME
 *     -definition: {
 *     where:STRING,
 *     limit:STRING,
 *     orderBy:STRING,
 *     groupBy:FIELD,
 *     groupByStrict:FIELDS,
 *     ref:false,
 *     join:[{
 *         table:STRING,
 *         on:STRING,
 *         clause:STRING (INNER,OUTER,LEFT,RIGHT),
 *         where:{},
 *         feilds:{ //OPTIONAL
 *         
 *         }
 *     }]
 *     }
 * JOIN Query
 * select -t1.Column, t2.Column -TBL as t1, TBL2 as t2 -join(@table(t2) @clause(INNER) @on(t1.column=t2.column))
 * 
 * WhereIn Query
 * select -* -t1, t2 -where(IN([@select(t2.column) @table(t2) || @value([values])] @field(t1.column)))
 * 
 * WhereNotIn Query
 * select -* -t1, t2 -where(NOTIN([@select(t2.column) @table(t2) || @value([values])] @field(t1.column)))
 * 
 * Like Query
 * select -* -t1 -where(Like(@value(needle) @field(t1.column)))
 * **/
function transactionSelect(selectFields, definition) {
    var $self = this,
        _sData = [],
        _qTables = [],
        time = performance.now();

    //reference our select query
    if (!selectFields) {
        this.setDBError("Column_Name is required else use a wildcard (*)");
    }

    var queryDefinition = extend(true, {
        fields: selectFields,
        where: null,
        in: [],
        ref: false,
        like: "",
        join: null
    }, definition || {});

    // check for duplicate definition
    if (queryDefinition.groupByStrict && queryDefinition.groupBy) {
        this.setDBError("Clause: groupByStrict cannot be used with groupBy");
    }

    if (queryDefinition.groupByStrict && queryDefinition.groupByStrict.indexOf(",") < 0) {
        this.setDBError("Clause: groupByStrict requires two fields for matching");
    }

    if (queryDefinition.join && !$isArray(queryDefinition.join)) {
        this.setDBError("Expected Join clause to be an array");
    }

    //@Function Name processQueryData
    //@Arguments nill
    // 
    if (queryDefinition.fields) {
        //Split through the queryColumn
        var queryColumn = queryDefinition.fields.split(",");

        if (queryDefinition.join && $isEqual(selectFields, '*')) {
            $self.setDBError('Invalid Select Statment.');
        }

        //Loop through queryColumn
        queryColumn.forEach(function(query) {
            if ($inArray(query, ".")) {
                if ($self.isMultipleTable) {
                    query = query.replace(/\((.*?)\)/, "|$1").split("|");
                    if ($isEqual(query[0].toLowerCase(), 'case')) {
                        tblName = query[1].split(new RegExp("when", "gi"))[1].split(".")[0];
                    } else {
                        tblName = (query[1] || n[0]).split(".")[0];
                    }

                    //reference to the tables
                    if (!$self.tableInfoExists(tblName.trim())) {
                        $self.setDBError(tblName + " was not found, Include table in transaction Array eg: db.transaction(['table_1','table_2'])");
                    }
                }
            }
        });
    }

    //FUnction for Join Clause
    //@Function Name : setJoinTypeFn
    //@Argument : BOOLEAN true:false
    //@return Function(resolver)
    /**
     * 
     * @param {*} processed 
     * @param {*} processedData 
     * @param {*} totalRecord 
     * @param {*} idx 
     * @param {*} resolver 
     * @param {*} clause 
     * @param {*} joinType 
     */
    function setJoinTypeFn(isMatch, idx, resolver, clause, joinType) {
        //INNER JOIN FN
        //@argument resolver {OBJECT}
        switch (joinType.toLowerCase()) {
            /**
             * The INNER JOIN keyword selects records that have matching values in both tables.
             */
            case ('inner'):
                if (isMatch) {
                    _sData.push(resolver);
                }
                break;
                /**
                 * The LEFT JOIN keyword returns all records from the left table (table1), 
                 * and the matched records from the right table (table2). 
                 * The result is NULL from the right side, if there is no match
                 */

                /**
                 * The RIGHT JOIN keyword returns all records from the right table (table2), 
                 * and the matched records from the left table (table1). 
                 * The result is NULL from the left side, when there is no match.
                 */
            case ('left'):
            case ('right'):
                //push all left table to array
                _sData[idx] = extend(true, resolver, _sData[idx] || {});

                break;

                /**
                 * The FULL OUTER JOIN keyword return all records when there is a match in either left (table1) or right (table2) table records.
                 * Note: FULL OUTER JOIN can potentially return very large result-sets!
                 * Algorithm : Match the lefttable before right
                 */
            case ('outer'):
                if ($inArray('left', clause)) {
                    _sData[idx] = extend(true, resolver, _sData[idx] || {});
                } else {
                    if (!isMatch) {
                        _sData[idx] = extend(true, resolver, _sData[idx] || {});
                    }
                }
                break;
        }
    }

    /**
     * 
     * @param {*} _data
     * restructure jELiData storage 
     */
    function removeJeliDataStructure(_data) {
        return _data.map(function(item) {
            return item._data;
        });
    }

    //Function Table Matcher
    /**
     * 
     * @param {*} joinObj 
     * @param {*} clause 
     */
    function matchTableFn(joinObj, clause) {
        var joinOn = joinObj.on.split("="),
            startLogic = joinOn[0].split("."),
            innerLogic = joinOn[1].split("."),
            queryMatchIsLeft = $isEqual(joinObj.table, startLogic[0]),
            isRightClause = $isEqual('right', clause);
        /**
         * compare the matching tables
         */
        if (isRightClause && !queryMatchIsLeft) {
            var stash = startLogic;
            startLogic = innerLogic;
            innerLogic = stash;
            stash = null;
        }

        var leftTable = getTableData(startLogic[0]),
            rightTable = getTableData(innerLogic[0]),
            leftCol = startLogic[1],
            rightCol = innerLogic[1],
            leftTableMappingName = startLogic[0],
            rightTableMappingName = innerLogic[0],
            counter = 0;
        /**
         * check if clause is inner 
         * check length of each table
         * t2 > t1
         * t1 = t2
         * t2 = t1
         */
        if (clause == "inner" && leftTable.length > rightTable.length) {
            var stash = leftTable;
            leftTable = rightTable;
            rightTable = leftTable;
        }

        var _right_table_map_ = rightTable.map(function(item) { return item._data[rightCol]; });
        //start process
        //query the leftTable Data
        leftTable.forEach(filterRightTable);
        /**
         * 
         * @param {*} lItem 
         * @param {*} _index 
         */
        function filterRightTable(lItem, _index) {
            var resObject = {},
                _idx_ = _right_table_map_.indexOf(lItem._data[leftCol]),
                $isFound = _idx_ > -1;
            resObject[leftTableMappingName] = lItem._data;
            resObject[rightTableMappingName] = {};

            if ($isFound) {
                resObject[rightTableMappingName] = rightTable[_idx_]._data;
            }
            setJoinTypeFn($isFound, _index, resObject, clause, joinObj.clause);
        }

        return ({
            recur: function(match) {
                return matchTableFn(joinObj, match)
            }
        });
    }

    /**
     * 
     * @param {*} data 
     * @param {*} chunk_size 
     */
    function splitChucnk(data, chunk_size) {
        var _newChunk = [];
        while (data.length) {
            _newChunk.push(data.splice(0, chunk_size))
        }
        return _newChunk
    }

    function getTableData(tableName) {
        return $self.getTableInfo(tableName).data;
    }

    function performInClauseQuery() {
        queryDefinition.where.forEach(function(item) {
            Object.keys(item).forEach(function(key) {
                if ($inArray(item[key].type, ["$inClause", "$notInClause"])) {
                    runClause(item, key);
                }
            });
        });

        function runClause(item, key) {
            var clause = item[key],
                value = clause.value,
                clauseTable = getTableData(clause.table);
            if (!value && clause.table) {
                if (!$self.tableInfoExists(clause.table) && !$isEqual(clauseTable['TBL_NAME'], clause.table)) {
                    return $self.setDBError(clause.table + " was not found, Include table in transaction");
                }

                if (!clause.select || clause.select === "*") {
                    return $self.setDBError("invalid clause field, field should contain a single column");
                }

                clause.isArrayResult = true;
                value = $self.getColumn(new $query(clauseTable)._(clause.where), clause);
            }

            // attach clause to query
            item[key] = {
                type: clause.type,
                value: value
            };
        }
    }

    //Push our executeState Function into Array
    this.executeState.push(["select", function() {
        // convert where query to an object
        if (queryDefinition.where) {
            if ($isString(queryDefinition.where)) {
                queryDefinition.where = $query._parseCondition(queryDefinition.where);
            } else if ($isObject(queryDefinition.where)) {
                console.warn("Support for Object type WHERE clause will be removed in next version");
                queryDefinition.where = [queryDefinition.where];
            }
            performInClauseQuery();
        }

        if ($self.hasError()) {
            //Throw new error
            throw new Error($self.getError());
        }

        var resultSet = [];
        if (queryDefinition.join) {
            //Table matcher
            //Matches the leftTable to RightTable
            //returns both Match and unMatched Result
            queryDefinition.join.forEach(function(join) {
                switch (join.clause.toLowerCase()) {
                    case ('outer'):
                        matchTableFn(join, 'left').recur('right');
                        break;
                    default:
                        matchTableFn(join, join.clause.toLowerCase());
                        break;
                }
            });

            if (queryDefinition.where) {
                resultSet = $self.getColumn(new $query(_sData)._(queryDefinition.where), queryDefinition);
            } else {
                resultSet = $self.getColumn(_sData, queryDefinition);
            }
        } else {
            resultSet = $self.getColumn(new $query(getTableData($self.tables._[0]))._(queryDefinition.where), queryDefinition);
        }

        //return the processed Data
        return new SelectQueryEvent(resultSet, (performance.now() - time));
    }]);

    /**
     * Select Public Api
     */
    var publicApi = Object.create({
        join: function(definition) {
            if (!$isObject(definition)) {
                throw new TypeError("join DEFINITION should be an object");
            }

            if (!queryDefinition.join) {
                queryDefinition.join = [definition];
            } else {
                queryDefinition.join.push(definition);
            }


            return this;
        },
        execute: function(condition) {
            return $self.execute(condition)
        },
        groupByStrict: function(groupKey) {
            queryDefinition.groupByStrict = groupKey;
            return this;
        },
        groupBy: function(groupKey) {
            queryDefinition.groupBy = groupKey;
            return this;
        },
        orderBy: function(orderBy) {
            queryDefinition.orderBy = orderBy;
            return this;
        }
    });

    publicApi.where = function(where) {
        //store where query
        queryDefinition.where = where;
        return this;
    };

    publicApi.limit = function(parseLimit) {
        queryDefinition.limit = parseLimit;
        return this;
    };


    return publicApi;
};