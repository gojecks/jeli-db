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
 *     pagination: true|false (default: false)
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
    var _sData = [];
    var time = performance.now();
    var lookupTableCache = {};

    //reference our select query
    if (!selectFields)
        this.setDBError("Column_Name is required else use a wildcard (*)");

    var queryDefinition = Object.assign({
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
        if (queryDefinition.groupBy)
            this.setDBError("Clause: groupByStrict cannot be used with groupBy");

        if (queryDefinition.groupByStrict.indexOf(",") < 0)
            this.setDBError("Clause: groupByStrict requires two fields for matching");
    }

    if (queryDefinition.join && !isarray(queryDefinition.join))
        this.setDBError("Expected Join clause to be an array");

    // @Function Name processQueryData
    // @Arguments nill
    if (queryDefinition.join && isequal(selectFields, '*'))
        this.setDBError('Invalid Select Statment');

    var validateFields = () => {
        var queryFields = queryDefinition.fields.split(/(\w+\((.*?)\)+,|,)/).filter(item => (item && item !== ','));
        //Loop through queryFields
        for (var field of queryFields) {
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
    };

    /**
     * 
     * @param {*} joinObj 
     * @param {*} index 
     */
    var matchTableFn = (joinObj, joinIndex) => {
        var joinOn = joinObj.on.split("=");
        var leftLogic = joinOn[0].split(".");
        var rightLogic = joinOn[1].split(".");
        var queryMatchIsLeft = isequal(joinObj.table, this.tables[leftLogic[0]]);
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

        var rightTable = [];
        var leftTableCol = leftLogic[1];
        var rightTableCol = rightLogic[1];
        var leftTableMappingName = leftLogic[0];
        var rightTableMappingName = rightLogic[0];
        var rightTableIndex = [];
        // perform where query on joinClause
        var valueMethods = ValueMethods.createInstance(joinObj.field);
        QueryTaskPerformer.run(getTableData(joinObj.table), joinObj.where, result => {
            rightTable.push(valueMethods.getData(result._data));
            rightTableIndex.push(result._data[rightTableCol]);
        }, joinObj.limit);

        //start process
        //query the leftTable Data
        var length = _sData.length;
        var idx = 0;
        var result = [];
        while (length > idx) {
            var lItem = _sData[idx];
            var searchIndex = rightTableIndex.lastIndexOf((lItem[leftTableMappingName] || lItem)[leftTableCol]);
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

            performResolve(joinObj.resolve, resObject, rightTable, rightTableIndex);

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
            tobeResolved.forEach(function (resolve) {
                if (resolve.when && !QueryTaskPerformer.externalQuery(resolve.when)(resObject))
                    return;

                if (resolve.table)
                    resolvedTable = getTableData(resolve.table);

                // check if resolvedTable data exists
                if (!resolvedTable)
                    return;

                function resolveValues(tVal) {
                    var searchIndex = indexes.indexOf(tVal);
                    if (searchIndex > -1) {
                        tVal = resolvedTable[key] || key;
                        if (resolve.fields)
                            tVal = ValueMethods.instance.setField(resolve.fields).getData(tVal);

                        if (resolve.lookup)
                            tVal = performLookup(resolve.lookup, tVal, resolve.group);
                        // recursive resolve
                        if (resolve.resolve)
                            resolver(resolve.resolve);

                        if (resolve.recursive)
                            startResolver(tVal);

                        return tVal;
                    }

                    return null;
                }

                /**
                 * @param {*} entryObj 
                 */
                function startResolver(entryObj) {
                    var thenValue = modelGetter(resolve.then, entryObj);
                    if (thenValue) {
                        if (isarray(thenValue)) {
                            thenValue = thenValue.map(resolveValues);
                        } else {
                            thenValue = resolveValues(thenValue);
                        }
                        // write values
                        ValueMethods.writeToContext(resolve.as, entryObj, thenValue);
                    }
                }

                // init resolver
                startResolver(resObject);
            });
        }

        if (resolveQuery) {
            resolver(resolveQuery);
        }
    }

    /**
     * 
     * @param {*} lookupTable 
     * @param {*} tableName 
     * @param {*} on 
     * @param {*} fields 
     * @returns 
     */
    function getLookUpTableIndex(lookupTable, tableName, on, fields) {
        var name = tableName + ':' + on;
        if (!lookupTableCache[name])
            lookupTableCache[name] = lookupTable.map(function (item) { return item[on]; })

        return (foreignKey, total) => {
            var thenValue = null;
            var foundIndex = lookupTableCache[name].indexOf(foreignKey);
            if (foundIndex > -1) {
                thenValue = lookupTable[foundIndex];
                if (fields)
                    thenValue = ValueMethods.instance.setField(fields).getData(thenValue);
            }

            return thenValue;
        };
    }

    /**
     * 
     * @param {*} resolveLookup 
     * @param {*} data 
     */
    function performLookup(lookup, data, hasGroupBy) {
        if (lookup && data && lookup.table) {
            // run when condition check if defined
            if (lookup.when && !QueryTaskPerformer.externalQuery(lookup.when)(data))
                data = null;

            var tableName = ValueMethods.callMethod(lookup.table, data);
            var on = ValueMethods.callMethod(lookup.on, data);
            var lookupTable = getTableData(tableName, true);
            // no table table to look stop process
            if (!lookupTable) return;

            var key = ValueMethods.callMethod(lookup.key, data);
            var fields = ValueMethods.callMethod(lookup.fields, data);
            var valueByIndex = getLookUpTableIndex(lookupTable, tableName, on, fields);
            // we expect data to be array of foreignKeys to resolve
            if (isarray(data) && hasGroupBy) {
                var total = data.length;
                for (var i = 0; i < total; i++) {
                    var value = data[i];
                    var thenValue = valueByIndex(key ? value[key] : value, total);
                    if (thenValue) {
                        if (lookup.merge)
                            data[i] = Object.assign(value, thenValue);
                        else if (lookup.as)
                            value[lookup.as] = thenValue;
                        else
                            data[i] = thenValue;
                    }
                }
            } else {
                var thenValue = valueByIndex(key ? data[key] : data, 1);
                if (thenValue) {
                    if (lookup.merge)
                        Object.assign(data, thenValue);
                    else if (lookup.as)
                        data[lookup.as] = thenValue;
                    else
                        data = thenValue;
                }
            }

            lookupTable = null;
        }

        return data;
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
        if (!tableData || !tableData.length)
            return tableData;

        /**
         * loop through the data
         * return the required column
         */
        var fields = (queryInstance.field || queryInstance.fields || queryInstance.select || "");
        if (fields && !isequal(fields, '*')) {
            var hasSingleResultQuery = ['COUNT', 'MIN', 'MAX', 'SUM', 'AVG'].some(key => inarray(key, fields));
            var valueMethods = ValueMethods.createInstance(fields, tableData);
            if (!queryInstance.isArrayResult && hasSingleResultQuery && !fromJoinReq)
                return valueMethods.first();

            tableData = valueMethods.getAll(queryInstance.isArrayResult);
        } else {
            tableData = tableData.splice(0);
        }

        //return the tableData
        return QueryLimitMethods.process(queryInstance, tableData);
    }

    /**
     * 
     * @param {*} tableName 
     * @param {*} removeData 
     */
    var getTableData = (tableName, dataOnly) => {
        var data = this.getTableData(tableName);
        return !dataOnly ? data : data.map(function (item) { return item._data });
    };

    /**
     * 
     * @param {*} tableName 
     * @param {*} refId 
     * @returns 
     */
    var getTableDataWithIndexes = (tableName, refId) => {
        var data = this.getTableData(tableName);
        return data.reduce(function (accum, item) { return (accum.data.push(item._data), accum.indexes.push(item_data[refId]), accum) }, { data: [], indexes: [] });
    };

    /**
     * 
     * @param {*} clause
     * @param {*} key 
     * @returns 
     */
    var runClause = (clause) => {
        if (!clause.value && clause.table) {
            var clauseTable = getTableData(clause.table);
            if (!clauseTable) {
                return this.setDBError(clause.table + " was not found, please fix query and try again");
            }

            if (!clause.field || clause.field == "*") {
                return this.setDBError("invalid clause field, field should contain a single column and wildcard not accepted");
            }

            clause.isArrayResult = true;
            clause.value = performSelect(QueryTaskPerformer.run(clauseTable, clause.where), clause);
        }
    };

    /**
     * 
     * @param {*} key 
     * @param {*} item 
     */
    function runRecursiveCheck(key, item) {
        var type = (item.type || '').toLowerCase();
        if (type && ['inclause', 'notinclause'].includes(type)) {
            runClause(item);
        } else if (type == 'datediff' && !isarray(item.value)) {
            var match = /(\d+)([a-zA-Z]+)/.exec(item.value);
            if (match && match[1] && match[2]) {
                item.value = [parseInt(match[1].trim()), match[2].trim()];
            }
        } else if (type == 'groupexpressions') {
            item.value.expressions.forEach(citem => runRecursiveCheck(key, citem));
        }
    }

    function performQueryCheck() {
        for (var item of queryDefinition.where) {
            for (var key in item) {
                if (!isobject(item[key])) continue
                runRecursiveCheck(key, item[key]);
            }
        }
    }

    function performJoinQuery(rawTables) {
        /**
         * when queryDefinition.filterBefore is set to true
         * we perform where clause query on the initialTable
         */
        if (queryDefinition.filterBefore)
            QueryTaskPerformer.run(getTableData(rawTables[0], true), queryDefinition.where, resolveAndLookupQueryResult);
        else
            _sData = getTableData(rawTables[0], true);

        // Table matcher
        // Matches the leftTable to RightTable
        // returns both Match and unMatched Result
        queryDefinition.join.forEach(matchTableFn);
        if (!queryDefinition.filterBefore && queryDefinition.where)
            QueryTaskPerformer.run(_sData.splice(0), queryDefinition.where, resolveAndLookupQueryResult);
    }

    /**
     * @param {*} result 
     */
    function resolveAndLookupQueryResult(result) {
        var data = Object.assign({}, (result._data || result));
        performResolve(queryDefinition.resolve, data);
        data = performLookup(queryDefinition.lookup, data);
        _sData.push(data);
    }

    /**
     * 
     * @param {*} rawTables 
     * @param {*} isMultipleTable 
     */
    function performMainQuery(rawTables, isMultipleTable) {
        if (isMultipleTable) {
            for (var i = 0; i < rawTables.length; i++) {
                QueryTaskPerformer.run(getTableData(rawTables[i]), queryDefinition.where, resolveAndLookupQueryResult);
            }
        } else {
            QueryTaskPerformer.run(getTableData(rawTables[0]), queryDefinition.where, resolveAndLookupQueryResult)
        }
    }

    //Push our executeState Function into Array
    this.executeState.push(["select", () => {
        // convert where query to an object
        if (queryDefinition.where) {
            if (isstring(queryDefinition.where)) {
                queryDefinition.where = QueryBuilder._parseCondition(queryDefinition.where);
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
            performJoinQuery(this.rawTables);
        } else {
            performMainQuery(this.rawTables, this.isMultipleTable);
        }

        // get all records
        var totalRecords = _sData.length;
        resultSet = performSelect(_sData, queryDefinition);
        lookupTableCache = null;
        //return the processed Data
        return new SelectQueryEvent(
            resultSet, 
            queryDefinition.pagination, 
            (performance.now() - time)
        );
    }]);


    return new SelectQueryFacade(queryDefinition, (condition) => this.execute(condition));
}

/**
 * 
 * @param {*} queryDefinition 
 * @param {*} execute 
 */
class SelectQueryFacade {
    constructor(queryDefinition, execute) {
        this.queryDefinition = queryDefinition;
        this.execute = execute;
    }

    join(definition) {
        if (!isobject(definition)) {
            throw new TypeError("join DEFINITION should be an object");
        }

        if (!this.queryDefinition.join) {
            this.queryDefinition.join = [definition];
        } else {
            this.queryDefinition.join.push(definition);
        }

        return this;
    }

    groupByStrict(groupKey) {
        this.queryDefinition.groupByStrict = groupKey;
        return this;
    }

    groupBy(groupKey) {
        this.queryDefinition.groupBy = groupKey;
        return this;
    }

    orderBy(orderBy) {
        this.queryDefinition.orderBy = orderBy;
        return this;
    }

    where(where) {
        //store where query
        this.queryDefinition.where = where;
        return this;
    }

    limit(parseLimit) {
        this.queryDefinition.limit = parseLimit;
        return this;
    }
}