    /**
      #Transaction.select(query, [definition])
      @params query {STRING}
      @params definition {OBJECT}

      Perform query on selected Table and return the Data that matches the query
      -query : select -* -TBL_NAME
      -definition: {
        where:STRING,
        like:STRING,
        limit:STRING,
        orderBy:STRING,
        groupBy:FIELD,
        join:[{
          table:STRING,
          on:STRING,
          type:STRING (INNER,OUTER,LEFT,RIGHT),
          where:{},
          feilds:{ //OPTIONAL
            
          }
        }]
      }
    **/
function transactionSelect(selectFields, definition)
{
  var $self = this,
      _sData = [],
      _qTables = [];

    //reference our select query
  if(!selectFields)
  {
    this.setDBError("Left Table Query is required");
  }

  var queryDefinition = extend({},{
        fields:selectFields,
        where:"",
        inClause:[],
        like:"",
        join:[]
    },definition || {});


      //@Function Name processQueryData
      //@Arguments nill
      // 
        if(queryDefinition.fields)
        {
          //Split through the queryColumn
          var queryColumn = queryDefinition.fields.split(",");

          if(queryDefinition.join.length && $isEqual(selectFields,'*'))
          {
            $self.setDBError('Invalid Select Statment.');
          }

          //Loop through queryColumn
          queryColumn.forEach(function(n)
          {
              if(expect(n).contains("."))
              {
                if($self.isMultipleTable)
                {
                  n = n.replace(/\((.*?)\)/,"|$1").split("|");
                    tblName = $removeWhiteSpace((n[1] || n[0]).split(".")[0]);
                    //reference to the tables
                    if(!$self.tableInfo[tblName])
                    {
                      $self.setDBError(tblName +" was not found, Include table in transaction Array eg: db.transaction(['table_1','table_2'])");
                    }
                }else
                {
                  $self.setDBError("Single table SELECT query doesn't require tableName.columnName #:"+n);
                }
                
              }
          });
        }

      //FUnction for Join Clause
      //@Function Name : setJoinTypeFn
      //@Argument : BOOLEAN true:false
      //@return Function(resolver)
      function setJoinTypeFn(processed,processedData,totalRecord,counter)
      {
        //INNER JOIN FN
        //@argument resolver {OBJECT}
          return function(resolver,clause, joinType)
          {
            switch(joinType)
            {
                //INNER JOIN FN
                //@argument resolver {OBJECT}
                case('inner'):
                  if(processed)
                  {
                    _sData.push(resolver);
                  }
                break;
                //LEFT JOIN FN
                //RIGHT JOIN FN
                //@argument resolver {OBJECT}
                case('left'):
                case('right'):
                  //push all left table to array
                  if(!processed)
                  {
                    _sData.push( resolver );
                  }else
                  {
                    _sData.push.apply(_sData,processedData)
                  }
                break;

                //OUTTER JOIN FN
                //@argument resolver {OBJECT}
                //Algorithm : Match the lefttable before right
                case('outer'):
                  if(expect(clause).contains('left'))
                  {
                    if(!processed)
                    {
                      _sData.push( resolver );
                    }else
                    {
                      _sData.push.apply(_sData,processedData)
                    }
                  }else
                  {
                    if(!processed)
                    {
                      _sData.push( resolver );
                    }
                  }
                break;
            }
          }
        }

        // restructure jELiData storage
        function removeJeliDataStructure(_data){
          return _data.map(function(item){
            return item._data;
          });
        }

      //Function Table Matcher
      function matchTableFn(joinObj, clause)
      {
        var joinOn = joinObj.on.split("="),
            startLogic = joinOn[0].split("."),
            innerLogic = joinOn[1].split("."),
            startTable = removeJeliDataStructure($self.tableInfo[startLogic[0]].data),
            innerTable = removeJeliDataStructure($self.tableInfo[innerLogic[0]].data),
            innerLength = innerTable.length,
            startLength = startTable.length,
            leftTable = startTable,
            rightTable = innerTable,
            leftLogic = startLogic[1],
            rightLogic = innerLogic[1],
            leftTableLogic = startLogic[0],
            rightTableLogic = innerLogic[0];

          if($isEqual(clause,"right"))
          {
            leftTable = innerTable;
            rightTable = startTable;
            leftLogic = innerLogic[1];
            rightLogic = startLogic[1];
            leftTableLogic = innerLogic[0];
            rightTableLogic = startLogic[0];
          }

          var totalLeftRecord = leftTable.length,
              counter = 0;

          rightTable =  $self.getColumn( new $query(rightTable)._(joinObj.where), joinObj);

        //start process
        //query the leftTable Data
        expect(leftTable).search(null,function(lItem,lIdx)
        {
          var resObject = {},
              $isFound = 0,
              $foundObj = [];
              resObject[leftTableLogic] = lItem;
              resObject[rightTableLogic] = {};
            //Pass other filter
            expect(rightTable).search(null,function(rItem,rIdx)
            {
                //check match
                if( $isEqual(lItem[leftLogic], rItem[rightLogic]) )
                {
                  resObject[rightTableLogic] = rItem;
                  var temp = {};
                      temp[leftTableLogic] = lItem;
                      temp[rightTableLogic] = rItem;
                  $foundObj.push(temp);
                  $isFound++;
                }
               
                return true
            });

            counter++;
            setJoinTypeFn( $isFound, $foundObj, totalLeftRecord , counter )( resObject, clause, joinObj.clause );
            return true
        });

        return ({
            recur : function(match)
            {
              return matchTableFn(joinObj, match)
            }
        });
      }


      function stripWhereClause(){
        if($isObject(queryDefinition.where)){
          return;
        }
          // check for INARRAY CLAUSE in query
          // @usage : INARRAY([HAYSTACK, needle])
          queryDefinition.where.replace(/\INARRAY\(\[(.*?)\]\)/,function(key, match){
            queryDefinition.inClause.push({
              replacer:key,
              query:match.split(",")[0],
              contains:match.split(",")[1]
            });
            
            return key;
          });
      }

      function runInClause(){
        if(!queryDefinition.inClause.length){
          return;
        }

        queryDefinition.inClause.map(function(item, idx){
          performInClauseQuery(item, idx);
        });
      }

      function performInClauseQuery(item, idx){
        var inQuery = item.query.split(/(@)/gi).filter(function(item){
            return !("@".indexOf(item) > -1);
        }),
        inQueryDefinition = buildSelectQuery(inQuery);
        inQueryDefinition.fields = inQuery[1];
        queryDefinition.where = queryDefinition.where.replace(
            item.replacer,
            "String(JSON.stringify("+JSON.stringify($self.getColumn( new $query(removeJeliDataStructure($self.tableInfo[inQuery[2]].data))._(inQueryDefinition.where || ""), inQueryDefinition)) + ")).indexOf("+item.contains+") > -1;"
        );
      }

        //Push our executeState Function into Array
        this.executeState.push(["select",function()
        {
          stripWhereClause();
          runInClause();

          if($self.hasError())
          {
            //Throw new error
            throw new Error($self.getError());
          }

          if(queryDefinition.join.length)
          {

            //Table matcher
            //Matches the leftTable to RightTable
            //returns both Match and unMatched Result
            queryDefinition.join.forEach(function(join){
              switch(join.clause.toLowerCase())
              {
                case('outer'):
                  matchTableFn(join, 'left').recur('right');
                break;
                default:
                  matchTableFn(join, join.clause);
                break;
              }
            });
            
            if(queryDefinition.where)
            {
              return new $query( $self.getColumn(_sData, queryDefinition) )._(queryDefinition.where);
            }else{
              return  $self.getColumn(_sData, queryDefinition);
            }

          }

            //return the processed Data
            return $self.getColumn(new $query($self.tableInfo.data)._(queryDefinition.where), queryDefinition );
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
          var join = function(definition)
          {
            if(!$isObject(definition)){
              throw new Error("join DEFINITION should be an object");
            }

            queryDefinition.join.push(definition);
            
            return publicApi;
          },
          whereClause = function(where)
          {
            //store where query
            queryDefinition.where = where;
            return publicApi;
          },
          limit = function(parseLimit){
              queryDefinition.limit = parseLimit;
              return publicApi;
          },
          orderBy = function(orderBy){
            queryDefinition.orderBy = orderBy;
            return publicApi;
          },
          groupBy = function(groupKey){
            queryDefinition.groupBy = groupKey;
             return publicApi;
          },
          execute = function(condition){
            return $self.execute(condition)
          };


        var publicApi = ({
            join:join,
            limit:limit,
            where : whereClause,
            groupBy: groupBy,
            orderBy:orderBy,
            execute : execute
        });

    return publicApi;
};
