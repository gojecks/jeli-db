/**
 *   #Transaction.select(selectFields, [definition])
 *   @params selectFields {STRING}
 *   @params definition {OBJECT}
 *     Perform query on selected Table and return the Data that matches the query
 *     -query : select -* -TBL_NAME
 *     -definition: {
 *     aggregate: {},
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
    var resultSet = [];

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
        QueryTaskPerformer.run(this.getTableData(joinObj.table), joinObj.where, result => {
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
    var performResolve = (resolveQuery, resObject, resolvedTable, indexes) => {
        var resolver = (tobeResolved) => {
            tobeResolved.forEach(function (resolve) {
                if (resolve.when && !QueryTaskPerformer.externalQuery(resolve.when)(resObject))
                    return;

                if (resolve.table)
                    resolvedTable = this.getTableData(resolve.table);

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
        };

        if (resolveQuery) {
            resolver(resolveQuery);
        }
    };

    /**
     * 
     * @param {*} resolveLookup 
     * @param {*} data 
     */
    var performLookup = (lookup, data, hasGroupBy) => {
        if (lookup && data && lookup.table) {
            // run when condition check if defined
            if (lookup.when && !QueryTaskPerformer.externalQuery(lookup.when)(data))
                data = null;

            var tableName = ValueMethods.callMethod(lookup.table, data);
            var on = ValueMethods.callMethod(lookup.on, data);
            var lookupTable = this.getTableData(tableName, true);
            // no table table to look stop process
            if (!lookupTable) return;

            var key = ValueMethods.callMethod(lookup.key, data);
            var fields = ValueMethods.callMethod(lookup.fields, data);
            var valueByIndex = getLookUpTableIndex(lookupTable, tableName, on, fields);
            /**
             * lookupAndAssign
             * @param {*} currentData 
             * @param {*} total 
             */
            var lookupAndAssign = (currentData, total) => {
                var thenValue = valueByIndex(key ? currentData[key] : currentData, total);
                if (thenValue) {
                    if (lookup.merge)
                        Object.assign(currentData, thenValue);
                    else if (lookup.as)
                        currentData[lookup.as] = thenValue;
                    else
                        currentData = thenValue;
                } else if(lookup.strict) {
                    currentData = null;
                }

                return currentData;
            };

            // we expect data to be array of foreignKeys to resolve
            if (isarray(data) && hasGroupBy) {
                var total = data.length;
                data = data.reduce((accum, item) => {
                    var lkValue = lookupAndAssign(item, total);
                    if (lkValue) accum.push(lkValue);
                    return accum;
                }, []);
            } else {
                data = lookupAndAssign(data, 1);
            }

            lookupTable = null;
        }

        return data;
    };

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
        }

        //return the tableData
        return QueryLimitMethods.process(queryInstance, tableData);
    }

    /**
     * 
     * @param {*} clause
     * @param {*} key 
     * @returns 
     */
    var runClause = (clause) => {
        if (!clause.value && clause.table) {
            var clauseTable = this.getTableData(clause.table);
            if (!clauseTable) {
                return this.setDBError(clause.table + " was not found, please fix query and try again");
            }

            if (!clause.field || clause.field == "*") {
                return this.setDBError("invalid clause field, field should contain a single column and wildcard not accepted");
            }

            clause.isArrayResult = true;
            clause.value = performSelect(QueryTaskPerformer.run(clauseTable, clause.where), clause);
            if (clause.extend) {
                clause.value.push.apply(clause.value, clause.extend);
            }
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

    var queryRunner = () => {
        var group = null;
        var groupResult = new Map();
        if (queryDefinition.groupBy) {
            group = Array.isArray(queryDefinition.groupBy) ? queryDefinition.groupBy : [queryDefinition.groupBy];
        }

        return table => {
            QueryTaskPerformer.run(isstring(table) ? this.getTableData(table) : table, queryDefinition.where, result => {
                result = Object.assign({}, (result._data || result));
                performResolve(queryDefinition.resolve, result);
                result = performLookup(queryDefinition.lookup, result);

                // return when result is null
                // could happen due to strict matcher for lookup
                if (!result) return;

                if (group) {
                    var key = group.map(k => modelGetter(k, result)).sort().join(':');
                    if (!groupResult.has(key)) {
                        groupResult.set(key, []);
                    }
                    
                    groupResult.get(key).push(result);
                } else {
                    _sData.push(result);
                }
            });

            if (group) {
                _sData = Array.from(groupResult.values());
                groupResult.clear();
            }
        };
    };


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
            
            for (var item of queryDefinition.where) {
                for (var key in item) {
                    if (!isobject(item[key])) continue
                    runRecursiveCheck(key, item[key]);
                }
            }
        }

        if (this.hasError()) {
            //Throw new error
            throw new TransactionErrorEvent('select', this.getError());
        }

        var runner = queryRunner();
        this.rawTables, this.isMultipleTable
        if (this.isMultipleTable) {
            this.rawTables.forEach( tbl => runner(tbl));
        } else if (queryDefinition.join) {
            /**
            * when queryDefinition.filterBefore is set to true
            * we perform where clause query on the initialTable
            */
            if (queryDefinition.filterBefore) {
                runner(this.rawTables[0]);
            } else {
                _sData = this.getTableData(this.rawTables[0], true);
            }

            // Table matcher
            // Matches the leftTable to RightTable
            // returns both Match and unMatched Result
            queryDefinition.join.forEach(matchTableFn);
            if (!queryDefinition.filterBefore && queryDefinition.where) {
                runner(_sData.splice(0));
            }
        } else {
            runner(this.rawTables[0]);
        }

        var pagination = null;
        if (queryDefinition.pagination){
            const limit = QueryLimitMethods.parseLimit(queryDefinition.limit);
            const total = _sData.length;
            // L(n) limit type
            if (0 > limit[0]) {
                limit = [(total - limit[1]), total];
            }
            const size = (limit[1] - limit[0]);
            pagination = {
                total,
                pages: Math.ceil(total / size),
                current: Math.ceil(limit[1] / size),
                size,
            }
        }

        // get all records
        resultSet = performSelect(_sData, queryDefinition);
        lookupTableCache = null;
        //return the processed Data
        return new SelectQueryEvent(
            resultSet,
            pagination,
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

    aggregate(definition) {
        this.queryDefinition.aggregate = definition;
        return this;
    }
}