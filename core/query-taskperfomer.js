
function $query(data)
{
    this.sortBy = function()
    {
      var sortArguments = arguments;
      if($isArray(data))
      {
          return data.sort(function(obj1, obj2)
          {
              /*
               * save the arguments object as it will be overwritten
               * note that arguments object is an array-like object
               * consisting of the names of the properties to sort by
               */
              var props = sortArguments,
                  i = 0, 
                  result = 0, 
                  numberOfProperties = props.length;
                    /* try getting a different result from 0 (equal)
                     * as long as we have extra properties to compare
                     */
                    while(result === 0 && i < numberOfProperties) 
                    {
                        result = compare(props[i])(obj1, obj2);
                        i++;
                    }
              
              return result;
          });
      }
    };

    this.where = function(logic,callback)
    {
      if($isArray(data) && logic)
      {
        var logic = removeSingleQuote(logic),
            filter = $removeWhiteSpace(logic).split(/(?:like):/gi);

        return data.filter(function(item,idx)
        {
            var found = ((filter.length > 1)?(String(item[filter[0]] || '').toLowerCase().search(String(filter[1]).toLowerCase()) !== -1) : $logicChecker(logic,item));

            if(callback && found)
            {
                callback.call(item,idx);
            }
            //set the data if found
            return found;
        })
      }

      return data; 
    };


    this._ = function(logic,callback)
    {
      var _search = [];

        if($isArray(data))
        {
            var _setLogicPerformer = new externalQuery(logic);

              //Query the required Data
              //Match the Result with Logic
              //@return : ARRAY Search result
              expect(data).search(null,function(item,idx)
              {
                  var found = _setLogicPerformer(item,idx);
                  if(found)
                  {
                      if($isFunction(callback))
                      {
                         callback(item,idx);
                      }else
                      {
                        _search.push(item._data);
                      }
                  }
              });

              return _search;
        }

        return data;
    };

      function compare(property) 
      {
        var sortOrder = 1;
        return function(a,b)
        {
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        };
      }
}


 //externalQuery Function
 //@param : string
 //@return : Function

 function externalQuery(logic){
    var keyLen,
        pCondition;

    //parse Condition
    function _parseCondition(condition)
    {
      var ret = {like:[],normal:[]};
      for(var a in condition)
      {
          if(condition[a])
          {
            var cCheck = condition[a].split(/:(?:like):/gi),
                cret = {exp : condition[a], task : cCheck}; //split the like condition
            if(cCheck.length > 1){ //Like Condition found
              ret.like.push(cret);
            }else{
              ret.normal.push(cret);
            } 
          }
      }

      return ret;
    }

    this.objectQueryTaskPerformer = function(item)
    {
        var found = 0;
        //Loop through the logic
            //match found item
          for(var op in logic)
          {
              switch(typeof item._data[op]){
                case('object'):
                  if(JSON.stringify(logic[op]) === JSON.stringify(item._data[op])){
                    found++;
                  }
                break;
                default:
                  if(logic[op] === item._data[op]){
                    found++;
                  }
                break;
              }
          }

          return keyLen === found;
    };

    this.likeQueryTaskPerformer = function(item,idx){
          var found = false,
              cLogic = logic;

        //Loop through the logic
        //match found item
        var lLen = pCondition.like.length;
        while(lLen--){
          var cur = String(maskedEval(pCondition.like[lLen].task[0],item._data) || ''),
              fnd = (cur.toLowerCase().search(String(pCondition.like[lLen].task[1]).toLowerCase())) > -1;

          cLogic = cLogic.replace(pCondition.like[lLen].exp,fnd);
        }

        if(pCondition.normal.length)
        {
          var lLen = pCondition.normal.length;
          while(lLen--){
            cLogic = cLogic.replace(pCondition.normal[lLen].exp,maskedEval(pCondition.normal[lLen].task[0],item._data));
          }
        }

        return maskedEval(cLogic);
    };

    this.normalQueryTaskPerformer = function(item){
      return maskedEval(logic,item._data)
    };

    if(logic)
    {
        if($isObject(logic))
        {
          keyLen = Object.keys(logic).length;
          return this.objectQueryTaskPerformer;
        }else
        {
          logic = $removeWhiteSpace(logic);
            pCondition = _parseCondition(logic.split(/[&&||]/gi));
            if(pCondition.like.length){
              return this.likeQueryTaskPerformer;
            }else{
              return this.normalQueryTaskPerformer;
            }
        }
    }else{
      return function(){
        //push data into _search
        return true;
      }
    }
 }