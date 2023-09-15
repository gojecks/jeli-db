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
    var _this = this;
    var _sData = [];
    var time = performance.now();

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
        join: null,
        limit: 10
    }, definition || {});

    // check for duplicate definition
    if (queryDefinition.groupByStrict) {
        if (queryDefinition.groupBy){
            this.setDBError("Clause: groupByStrict cannot be used with groupBy");
        }
            
        if (queryDefinition.groupByStrict.indexOf(",") < 0) {
            this.setDBError("Clause: groupByStrict requires two fields for matching");
        }
    }

    if (queryDefinition.join && !isarray(queryDefinition.join)) {
        this.setDBError("Expected Join clause to be an array");
    }

    //@Function Name processQueryData
    //@Arguments nill
    //
    if (queryDefinition.join && isequal(selectFields, '*')) {
        this.setDBError('Invalid Select Statment');
    }

    function validateFields(){
        var queryFields = queryDefinition.fields.split(/(\w+\((.*?)\)+,|,)/).filter(item => (item && item !== ','));
        //Loop through queryFields
        for(var field of queryFields) {
            if (field.includes('.')) {
                if (this.isMultipleTable && field) {
                    field = field.replace(/\((.*?)\)/, '|$1').split('|');
                    var tblName = (field[1] || field[0]).split('.')[0];
                    if (isequal(field[0].toLowerCase(), 'case')) {
                        tblName = field[1].split(new RegExp('when', 'gi'))[1].split('.')[0];
                    }

                    //reference to the tables
                    if (!this.tableInfoExists(tblName.trim())) {
                        this.setDBError(tblName + ' was not found, Include table in transaction Array eg: db.transaction([table_1,table_2])');
                    }
                }
            }
        }
    }

    /**
     * 
     * @param {*} joinObj 
     * @param {*} index 
     */
    function matchTableFn(joinObj, joinIndex) {
        var joinOn = joinObj.on.split("=");
        var leftLogic = joinOn[0].split(".");
        var rightLogic = joinOn[1].split(".");
        var queryMatchIsLeft = isequal(joinObj.table, _this.tables[leftLogic[0]]);
        var clause = (joinObj.clause || 'INNER').toLowerCase();
        var isRightClause = isequal('right', clause);

        /**
         * should incase of wrong matching with ON clause
         * compare the matching tables
         * switch the matcher 
         */
        if (isRightClause && queryMatchIsLeft) {
            var stash = leftLogic;
            leftLogic = rightLogic;
            rightLogic = stash;
            stash = null;
        }

        var rightTable = getTableData(joinObj.table, true);
        var leftTableCol = leftLogic[1];
        var rightTableCol = rightLogic[1];
        var leftTableMappingName = leftLogic[0];
        var rightTableMappingName = rightLogic[0];
        /**
         * perform where query on joinClause
         */
        if (joinObj.where) {
            rightTable = queryPerformer(rightTable, joinObj.where, null, joinObj.limit);
        }

        // select fields if required
        if (joinObj.fields) {
            rightTable = performSelect(rightTable, joinObj, true);
        }


        var rightTableIndex = rightTable.map(item => item[rightTableCol]);

        //start process
        //query the leftTable Data
        var length = _sData.length;
        var idx = 0;
        var result = [];
        while (length > idx) {
            var lItem = _sData[idx];
            var searchIndex = rightTableIndex.indexOf((lItem[leftTableMappingName] || lItem)[leftTableCol]);
            var resObject = {};
            resObject[rightTableMappingName] = searchIndex > -1 ? rightTable[searchIndex] : null;
            if (joinIndex) {
                Object.assign(resObject, lItem);
            } else {
                resObject[leftTableMappingName] = lItem;
            }

            /**
             * The INNER JOIN keyword selects records that have matching values in both tables.
             */
            if (clause === 'inner') {
                if (resObject[rightTableMappingName]) {
                    result.push(resObject);
                }
            }
            /**
             * The FULL OUTER JOIN keyword return all records when there is a match in either left (table1) or right (table2) table records.
             * Note: FULL OUTER JOIN can potentially return very large result-sets!
             * Algorithm : Match the lefttable before right
             */
            else if (clause === 'outer') {
                // to be re-implemented
            }
            /**
             * The LEFT JOIN keyword returns all records from the left table (table1), 
             * and the matched records from the right table (table2). 
             * The result is NULL from the right side, if there is no match
             * 
             * The RIGHT JOIN keyword returns all records from the right table (table2), 
             * and the matched records from the left table (table1). 
             * The result is NULL from the left side, when there is no match.
             */
            else {
                result.push(resObject);
            }

            if (isarray(joinObj.resolve)) {
                performResolve(joinObj.resolve, resObject, rightTable, rightTableIndex);
            }

            ++idx;
        }

        _sData = result;
        result = null;
    }

    /**
     * 
     * @param {*} resolveQuery 
     * @param {*} resObject 
     * @param {*} resolvedTable 
     * @param {*} indexes 
     */
    function performResolve(resolveQuery, resObject, resolvedTable, indexes) {
        function resolver(tobeResolved) {
            tobeResolved.forEach(function(resolve) {
                if (resolve.when && externalQuery(resolve.when)(resObject)) {
                    return;
                }

                if (resolve.table) {
                    resolvedTable = getTableData(resolve.table);
                }

                if (!resolvedTable) {
                    return;
                }

                function getValue(key) {
                    return resolvedTable[key] ? resolvedTable[key] : key;
                }

                var thenValue = modelGetter(resolve.then, resObject);
                var searchIndex = indexes.indexOf(thenValue);
                if (thenValue && searchIndex > -1) {
                    thenValue = getValue(searchIndex);
                    if (resolve.fields) {
                        thenValue = ValueMethods.staticInstance.setField(resolve.fields).getData(thenValue);
                    }

                    if (resolve.lookup) {
                        performLookup(resolve.lookup, thenValue, resolve.group);
                    }

                    ValueMethods.writeToContext(resolve.as, resObject, thenValue);
                    // recursive resolve
                    if (resolve.resolve) {
                        resolver(resolve.resolve);
                    }
                }
            });
        }

        resolver(resolveQuery);
    }

    /**
     * 
     * @param {*} resolveLookup 
     * @param {*} data 
     */
    function performLookup(lookup, data, hasGroupBy) {
        if (data && lookup.table) {
            if (lookup.when && !externalQuery(lookup.when)(data)) {
                data = null;
            }
            var lookupTable = getTableData(lookup.table);
            var indexes = lookupTable.map(function(item) { return item[lookup.on]; });

            function getValue(foreignKey, total) {
                var thenValue = null;
                var foundIndex = indexes.indexOf(foreignKey);
                if (foundIndex > -1) {
                    thenValue = lookupTable[foundIndex];
                    if (lookup.fields) {
                        thenValue = ValueMethods.staticInstance.setField(lookup.fields).getData(thenValue);
                    }
                }

                return thenValue;
            };

            // we expect data to be array of foreignKeys to resolve
            if (isarray(data) && hasGroupBy) {
                var total = data.length;
                for (var i = 0; i < total; i++) {
                    var value = data[i];
                    var thenValue = getValue(lookup.key ? value[lookup.key] : value, total);
                    if (thenValue) {
                        if (lookup.merge) {
                            data[i] = Object.assign(value, thenValue);
                        } else if (lookup.as) {
                            value[lookup.as] = thenValue;
                        } else {
                            data[i] = thenValue;
                        }
                    }
                }
            } else {
                var thenValue = getValue(lookup.key ? value[lookup.key] : value, 1);
                if (thenValue) {
                    if (lookup.merge) {
                        Object.assign(data, thenValue);
                    } else if (lookup.as) {
                        data[lookup.as] = thenValue;
                    } else {
                        data = thenValue;
                    }
                }
            }

            lookupTable = null;
        }
    }

    /**
     * 
     * @param {*} tableData 
     * @param {*} queryInstance 
     * @param {*} fromJoinReq 
     * @returns 
     */
    function performSelect(tableData, queryInstance, fromJoinReq) {
        /**
         * empty or invalid dataSet
         */
        if (!tableData || !tableData.length) {
            return tableData;
        }

        /**
         * loop through the data
         * return the required column
         */
        var fields = (queryInstance.field || queryInstance.fields || queryInstance.select || "");
        if (fields && !isequal(fields, '*')) {
            var hasSingleResultQuery = ['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].some(key => inarray(key, fields));
            var valueMethods = new ValueMethods(fields, tableData);
            if (!queryInstance.isArrayResult && hasSingleResultQuery && !fromJoinReq)
                return valueMethods.first();

            tableData = valueMethods.getAll(queryInstance.isArrayResult);
        } else {
            tableData = tableData.splice(0);
        }

        //return the tableData
        return QueryLimitMethods(queryInstance, tableData);
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} removeData 
     */
    function getTableData(tableName, dataOnly) {
        var data = _this.getTableData(tableName);
        if (dataOnly) {
            return data.map(function(item) { return item._data });
        }

        return data;
    }

    function performQueryCheck() {
        for(var item of queryDefinition.where) {
            for(var key in item) {
                if (!isobject(item[key])) continue
                var type = (item[key] ? item[key].type : '').toLowerCase();
                if (type && ['inclause', 'notinclause'].includes(type)) {
                    runClause(item, key);
                } else if(type  == 'datediff' && !isarray(item[key].value)){
                    var match = /(\d+)([a-zA-Z]+)/.exec(item[key].value);
                    if(match && match[1] && match[2]){
                        item[key].value = [parseInt(match[1].trim()), match[2].trim()];
                    }
                }
            }
        }
        /**
         * 
         * @param {*} item 
         * @param {*} key 
         * @returns 
         */
        function runClause(item, key) {
            var clause = item[key];
            var value = clause.value;
            if (!value && clause.table) {
                var clauseTable = getTableData(clause.table);
                if (!clauseTable) {
                    return _this.setDBError(clause.table + " was not found, please fix query and try again");
                }

                if (!clause.field || clause.field === "*") {
                    return _this.setDBError("invalid clause field, field should contain a single column and wildcard not accepted");
                }

                clause.isArrayResult = true;
                value = queryPerformer(clauseTable, clause.where);
                value = performSelect(value, clause);
            }

            // attach clause to query
            item[key] = {
                type: clause.type,
                value: value
            };
        }
    }

    function performJoinQuery() {
        /**
         * when queryDefinition.filterBefore is set to true
         * we perform where clause query on the initialTable
         */
        _sData = getTableData(_this.rawTables[0], true);
        if (queryDefinition.filterBefore) {
            _sData = queryPerformer(_sData, queryDefinition.where);
        }

        //Table matcher
        //Matches the leftTable to RightTable
        //returns both Match and unMatched Result
        queryDefinition.join.forEach(matchTableFn);
        if (!queryDefinition.filterBefore && queryDefinition.where) {
            _sData = queryPerformer(_sData, queryDefinition.where);
        }
    }

    function performMainQuery() {
        if (_this.isMultipleTable) {
            for (var i = 0; i < _this.rawTables.length; i++) {
                var result = queryPerformer(getTableData(_this.rawTables[i]), queryDefinition.where);
                _sData.push.apply(_sData, result);
            }
        } else {
            _sData = queryPerformer(getTableData(_this.rawTables[0]), queryDefinition.where)
        }
    }

    //Push our executeState Function into Array
    this.executeState.push(["select", () => {
        // convert where query to an object
        if (queryDefinition.where) {
            if (isstring(queryDefinition.where)) {
                queryDefinition.where = _parseCondition(queryDefinition.where);
            } else if (isobject(queryDefinition.where)) {
                console.warn("WHERE clause of type (Object) support will be removed in next version, please use type (Array<Object>)");
                queryDefinition.where = [queryDefinition.where];
            }
            performQueryCheck();
        }

        if (this.hasError()) {
            //Throw new error
            throw new TransactionErrorEvent('select', this.getError());
        }

        var resultSet = [];
        if (queryDefinition.join) {
            performJoinQuery();
        } else {
            performMainQuery();
        }

        resultSet = performSelect(_sData, queryDefinition);

        //return the processed Data
        return new SelectQueryEvent(resultSet, (performance.now() - time));
    }]);


    return new SelectQueryFacade(queryDefinition, (condition) => this.execute(condition));
}

/**
 * 
 * @param {*} queryDefinition 
 * @param {*} execute 
 */
function SelectQueryFacade(queryDefinition, execute) {
    this.join = function(definition) {
        if (!isobject(definition)) {
            throw new TypeError("join DEFINITION should be an object");
        }

        if (!queryDefinition.join) {
            queryDefinition.join = [definition];
        } else {
            queryDefinition.join.push(definition);
        }


        return this;
    };

    this.groupByStrict = function(groupKey) {
        queryDefinition.groupByStrict = groupKey;
        return this;
    };

    this.groupBy = function(groupKey) {
        queryDefinition.groupBy = groupKey;
        return this;
    };

    this.orderBy = function(orderBy) {
        queryDefinition.orderBy = orderBy;
        return this;
    };

    this.where = function(where) {
        //store where query
        queryDefinition.where = where;
        return this;
    };

    this.limit = function(parseLimit) {
        queryDefinition.limit = parseLimit;
        return this;
    };

    this.execute = execute;
}