/**
 *   #Transaction.select(selectFields, [definition])
 *   @params selectFields {STRING}
 *   @params definition {OBJECT}
 *     Perform query on selected Table and return the Data that matches the query
 *     -query : select -* -TBL_NAME
 *     -definition: {
 *     where:STRING,
 *     like:STRING,
 *     limit:STRING,
 *     orderBy:STRING,
 *     groupBy:FIELD,
 *     groupByStrict:FIELDS,
 *     ref:false,
 *     join:[{
 *         table:STRING,
 *         on:STRING,
 *         type:STRING (INNER,OUTER,LEFT,RIGHT),
 *         where:{},
 *         feilds:{ //OPTIONAL
 *         
 *         }
 *     }]
 *     }
 * **/
function transactionSelect(selectFields, definition) {
    var $self = this,
        _sData = [],
        _qTables = [];

    //reference our select query
    if (!selectFields) {
        this.setDBError("Column_Name is required else use a wildcard (*)");
    }

    var queryDefinition = extend({}, {
        fields: selectFields,
        where: "",
        inClause: [],
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
        queryColumn.forEach(function(n) {
            if (expect(n).contains(".")) {
                if ($self.isMultipleTable) {
                    n = n.replace(/\((.*?)\)/, "|$1").split("|");
                    if ($isEqual(n[0].toLowerCase(), 'case')) {
                        tblName = n[1].split(new RegExp("when", "gi"))[1].split(".")[0];
                    } else {
                        tblName = (n[1] || n[0]).split(".")[0];
                    }

                    //reference to the tables
                    if (!$self.tableInfo[$removeWhiteSpace(tblName)]) {
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
        switch (joinType) {
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
                if (expect(clause).contains('left')) {
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
        var joinOn = splitStringCondition(joinObj.on)[0].split("="),
            startLogic = joinOn[0].split("."),
            innerLogic = joinOn[1].split("."),
            queryMatchIsLeft = $isEqual($self.tables[$removeWhiteSpace(joinObj.table)], startLogic[0]),
            isRightClause = $isEqual('right', clause);
        /**
         * compare the matching tables
         */
        if ((!isRightClause && queryMatchIsLeft) || (isRightClause && !queryMatchIsLeft)) {
            startLogic = joinOn[1].split(".");
            innerLogic = joinOn[0].split(".");
        }

        var leftTable = removeJeliDataStructure($self.tableInfo[startLogic[0]].data.slice()),
            rightTable = removeJeliDataStructure($self.tableInfo[innerLogic[0]].data.slice()),
            leftCol = startLogic[1],
            rightCol = innerLogic[1],
            leftTableMappingName = startLogic[0],
            rightTableMappingName = innerLogic[0],
            counter = 0;

        /**
         * run WHERE and SELECT query on the join table1
         * before matching them
         */
        if (!isRightClause) {
            rightTable = $self.getColumn(new $query(rightTable)._(joinObj.where || null), joinObj);
        } else {
            leftTable = $self.getColumn(new $query(leftTable)._(joinObj.where || null), joinObj);
        }

        /**
         * Get the rightCol Mapping Value
         */
        var _right_table_map_ = rightTable.map(function(_item_) { return _item_[rightCol]; });

        //start process
        //query the leftTable Data
        expect(leftTable).each(filterRightTable);


        /**
         * 
         * @param {*} lItem 
         * @param {*} _index 
         */
        function filterRightTable(lItem, _index) {
            var resObject = {},
                _idx_ = _right_table_map_.indexOf(lItem[leftCol]),
                $isFound = _idx_ > -1
            resObject[leftTableMappingName] = lItem;
            resObject[rightTableMappingName] = {};

            if ($isFound) {
                resObject[rightTableMappingName] = rightTable[_idx_];
            }

            setJoinTypeFn($isFound, _index, resObject, clause, joinObj.clause);
        }

        return ({
            recur: function(match) {
                return matchTableFn(joinObj, match)
            }
        });
    }


    function stripWhereClause() {
        if ($isObject(queryDefinition.where)) {
            return;
        }
        // check for INARRAY CLAUSE in query
        // @usage : INARRAY([HAYSTACK, needle])
        queryDefinition.where.replace(/\INARRAY\(\[(.*?)\]\)/, function(key, match) {
            queryDefinition.inClause.push({
                replacer: key,
                query: match.split(",")[0],
                contains: match.split(",")[1]
            });

            return key;
        });
    }

    function runInClause() {
        if (!queryDefinition.inClause.length) {
            return;
        }

        queryDefinition.inClause.map(performInClauseQuery);
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

    /**
     * 
     * @param {*} item 
     * @param {*} idx 
     */
    function performInClauseQuery(item, idx) {
        var inQuery = item.query.split(/(@)/gi).filter(function(item) {
                return !("@".indexOf(item) > -1);
            }),
            inQueryDefinition = buildSelectQuery(inQuery);
        inQueryDefinition.fields = inQuery[1];
        queryDefinition.where = queryDefinition.where.replace(
            item.replacer,
            "String(JSON.stringify(" + JSON.stringify($self.getColumn(new $query(removeJeliDataStructure($self.tableInfo[inQuery[2]].data.slice()))._(inQueryDefinition.where || ""), inQueryDefinition)) + ")).indexOf(" + item.contains + ") > -1;"
        );
    }

    //Push our executeState Function into Array
    this.executeState.push(["select", function() {
        stripWhereClause();
        runInClause();

        if ($self.hasError()) {
            //Throw new error
            throw new Error($self.getError());
        }

        if (queryDefinition.join) {
            //Table matcher
            //Matches the leftTable to RightTable
            //returns both Match and unMatched Result
            expect(queryDefinition.join).each(function(join) {
                switch (join.clause.toLowerCase()) {
                    case ('outer'):
                        matchTableFn(join, 'left').recur('right');
                        break;
                    default:
                        matchTableFn(join, join.clause);
                        break;
                }
            });

            if (queryDefinition.where) {
                return $self.getColumn(new $query(_sData)._(queryDefinition.where), queryDefinition);
            } else {
                return $self.getColumn(_sData, queryDefinition);
            }
        }

        //return the processed Data
        return $self.getColumn(new $query(removeJeliDataStructure($self.tableInfo.data.slice()))._(queryDefinition.where), queryDefinition);
    }]);

    /*
      {
        table:STRING,
        on:STRING,
        type:STRING (INNER,OUTER,LEFT,RIGHT),
        where:{},
        feilds:{ //OPTIONAL
          
        }
      }
    */
    var join = function(definition) {
            if (!$isObject(definition)) {
                throw new Error("join DEFINITION should be an object");
            }

            queryDefinition.join.push(definition);

            return publicApi;
        },
        whereClause = function(where) {
            //store where query
            queryDefinition.where = where;
            return publicApi;
        },
        limit = function(parseLimit) {
            queryDefinition.limit = parseLimit;
            return publicApi;
        },
        orderBy = function(orderBy) {
            queryDefinition.orderBy = orderBy;
            return publicApi;
        },
        groupBy = function(groupKey) {
            queryDefinition.groupBy = groupKey;
            return publicApi;
        },
        execute = function(condition) {
            return $self.execute(condition)
        },
        groupByStrict = function(groupKey) {
            queryDefinition.groupByStrict = groupKey;
            return publicApi;
        };


    var publicApi = ({
        join: join,
        limit: limit,
        where: whereClause,
        groupBy: groupBy,
        orderBy: orderBy,
        execute: execute
    });

    return publicApi;
};