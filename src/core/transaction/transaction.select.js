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
        like:"",
        limit:false,
        orderBy:"asc",
        groupBy:false,
        join:[]
    },definition || {});


      //@Function Name processQueryData
      //@Arguments nill
      // 
      function processQueryData()
      {
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
                if(isMultipleTable)
                {
                    var splitColumn = n.split("."),
                    tblName = $removeWhiteSpace(splitColumn[0]);
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

      //Function Table Matcher
      function matchTableFn(joinObj, clause)
      {
        var startLogic = joinObj.on[0].split("."),
            innerLogic = joinObj.on[1].split("."),
            startTable = $self.tableInfo[startLogic[0]].data,
            innerTable = $self.tableInfo[innerLogic[0]].data,
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

        //start process
        //query the leftTable Data
        expect(leftTable).search(null,function(lItem,lIdx)
        {
          var resObject = {},
              _ldata = lItem._data,
              $isFound = 0,
              $foundObj = [];
              resObject[leftTableLogic] = _ldata;
              resObject[rightTableLogic] = {};
            //Pass other filter
            expect(rightTable).search(null,function(rItem,rIdx)
            {
                //check match
                var _rdata = rItem._data;
                if( $isEqual(_ldata[leftLogic],_rdata[rightLogic]) )
                {
                  resObject[rightTableLogic] = _rdata;
                  var temp = {};
                      temp[leftTableLogic] = _ldata;
                      temp[rightTableLogic] = _rdata;
                  $foundObj.push(temp);
                  $isFound++;
                }
               
                return true
            });

            counter++;
            setJoinTypeFn( $isFound, $foundObj, totalLeftRecord , counter )( resObject, clause, joinObj.type );
            return true
        });

        return ({
            recur : function(match)
            {
              return matchTableFn(joinObj, match)
            }
        });
      }

        //Push our executeState Function into Array
        this.executeState.push(["select",function()
        {
          //check if join is required
          processQueryData();

          if($self.hasError())
          {
            //Throw new error
            throw new Error($self.getError());
          }else
          {
              if(queryDefinition.join.length)
              {

                //Table matcher
                //Matches the leftTable to RightTable
                //returns both Match and unMatched Result
                queryDefinition.join.forEach(function(join){
                  switch(_joinTypeFn)
                  {
                    case('outer'):
                      matchTableFn(join, 'left').recur('right');
                    break;
                    default:
                      matchTableFn(join, join.type);
                    break;
                  }
                });
                

                if(queryDefinition.where)
                {
                  return new $query( $self.getColumn(_sData, queryDefinition) )._(queryDefinition.where);
                }else{
                  
                  return  $self.getColumn(_sData, queryDefinition);
                }

              }else
              {
                _sData = $self.tableInfo.data;
              }

              //return the processed Data
              return $self.getColumn(new $query(_sData)._(queryDefinition.where), queryDefinition );
          }
        }]);

          var join = function(statement)
          {
            if(expect(statement).contains(':'))
            {
              var clause = $removeWhiteSpace( statement ).split(":"),
                  type = clause.shift().toLowerCase(),
                  table = clause.pop();

              if($inArray(type,["inner","left","right","outer"]))
              {
                  return joinClause(type,table);
              }else
              {
                $self.setDBError("Invalid join clause used ("+type+")");
              }
            }else
            {
              $self.setDBError("JOIN clause requires a table Name e.g(inner:tablename)");
            }

            return joinClause(undefined);
          },
          joinClause = function(type,table)
          {
            queryDefinition.join.push({
              type:type,
              table:table
            });

              return ({
                on:function(oQuery)
                {
                  if(oQuery)
                  {
                    //perform the query
                    queryDefinition.join[queryDefinition.join.length-1].on = $removeWhiteSpace( oQuery ).split("=");
                  }else
                  {
                    //Push new error
                    $self.setDBError(type.toUpperCase() +' JOIN clause was required but was never used.');
                  }

                  return publicApi;
                }
              });
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