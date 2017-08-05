//get table column
function transactionSelectColumn(data,definition)
{
  //set the data to get column info from
  var columns = definition.fields.split(','),
      retData = [],
      data = getTableData(),
      d,
      $self = this,
      replacer = function(str){
        return str.replace(/\((.*?)\)/,"|$1").split("|");
      };

  /**
      @perFormLimitTask
      -Task
          :GROUPBY
          :orderBy
          :limit
  **/

  function performOrderLimitTask(cdata)
  {
    var actions = {
      groupBy:function(){
        cdata =  groupByTask(cdata);
      },
      orderBy : function(){
        cdata =  cdata.reverse();
      },
      limit : function(){
        cdata =  limitTask(cdata);
      }
    };

    Object.keys(definition).map(function(key){
      return (actions[key] || function(){})();
    })

     return copy(cdata, true);
  }

  function limitTask(data){
    return data.splice(parseInt(definition.limit.split(',')[0]),parseInt(definition.limit.split(',')[1]));
  }

  function groupByTask(cData){
    var ret = {};
      cData.forEach(function(item){
          if(!ret[item[definition.groupBy]]){
              ret[item[definition.groupBy]] = [];
          }

          ret[item[definition.groupBy]].push(item);
      });

  // map through the ret and return the result
  cData = Object.keys(ret).map(function(key){
      if(definition.limit){
        return limitTask(ret[key]);
      }else{
        return ret[key];
      }
  });

  ret = null;

  return cData;
}

    //loop through the data
    //return the required column
  if(!$isEqual(definition.fields,'*'))
  {
    for(d in data)
    {
      setColumnData();
    }
  }else
  {
    return performOrderLimitTask(data);
  }


  //Function getTbale data
  function getTableData()
  {
    //return data when its defined
      if($isArray(data))
      {
        return data;
      }else if($self.tableInfo.data) //return data when single table search
      {
        return $self.tableInfo.data;
      }
      else if($isString(data))
      {
        return $self.tableInfo[data].data;
      }
      
      return [];
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



  function setFieldValue(field, cdata){
    field = replacer(field);

    var privateApi = {
      COUNT : function(){
        return data.length
      },
      LOWERCASE:function(){
        return cdata[field[1]].toLowerCase();
      },
      UPPERCASE:function(){
        return cdata[field[1]].toUpperCase();
      },
      CURDATE:function(){
        return new Date().toLocaleString();
      },
      TIMESTAMP:function(){
        return new Date(cdata[field[1]]).getTime();
      },
      DATE_DIFF: function(){
        return new Date(cdata[field[1].split(',')[0]]) - new Date(cdata[field[1].split(',')[1]]);
      },
      CASE:function(){
        return maskedEval( field[1].replace(new RegExp("when","gi"),"").replace(new RegExp("then","gi"),"?").replace(new RegExp("else","gi"),":"), cdata);
      },
      GET:function(){
        return maskedEval(field[1], cdata);
      }
    };

    return ((privateApi[field[0]] && !cdata.hasOwnProperty(field[0]))?privateApi[field[0]]() : maskedEval(field[0], cdata));
  }
   

   //set the object to be returned
   function setColumnData()
   {
      var odata = {},
          fnd = 0,
          _cLen = columns.length;
      while(_cLen--)
      {
        var aCol = replacer(columns[_cLen]);
            aCol = aCol[1] || aCol[0];

        var 
            fieldName = aCol.split(' as '),
            tCol,
            cData = data[d];


        //if fieldName contains table name
        if(expect(aCol).contains('.'))
        {
          var spltCol = aCol.split(".");
              tCol = $removeWhiteSpace(spltCol.shift());
              // split our required column on ' as '
              fieldName = spltCol.join('.').split(' as ');
              //AS Clause is required 
              if(expect(aCol).contains(' as '))
              {
                tCol = false;
              }
        }

          // remove whiteSpace from our fieldName
          fieldName = JSON.parse($removeWhiteSpace(JSON.stringify(fieldName))) ;               

        var
            _as = fieldName.pop(),
            field =  fieldName.length?fieldName.shift():_as;

          //set the data
          if($isEqual(field,'*')){
            odata[_as] = cData[tCol] || cData;
          }else{
            odata[_as] = setFieldValue($removeWhiteSpace(columns[_cLen].split("as")[0]),cData);
          }
          
          fnd++;
      }

      if(fnd && !(JSON.stringify(retData).indexOf(JSON.stringify(odata)) >-1))
      {
        retData.push(odata);
      }
   }

   //return the data

    return performOrderLimitTask( retData );
};   