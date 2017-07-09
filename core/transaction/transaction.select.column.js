//get table column
function transactionSelectColumn(data,definition)
{
  //set the data to get column info from
  var columns = definition.fields.split(','),
      retData = [],
      data = getTableData(),
      d,
      tableInfo = this.tableInfo;

  /**
      @perFormLimitTask
      -Task
          :GROUPBY
          :orderBy
          :limit
  **/

  function performOrderLimitTask(cdata)
  {
    if(definition.groupBy){
      cdata = groupByTask(cdata);
    }else{
      if($isEqual(definition.orderBy.toLowerCase(), "desc")){
        cdata = cdata.reverse();
      }

      if(definition.limit)
       {
          cdata = limitTask(cdata);
       }
    }

     return copy(cdata, true);
  }

  function limitTask(data){
    var _startEnd = definition.limit.split(',');
    return data.splice(parseInt(_startEnd[0]),parseInt(_startEnd[1]));
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
      }else if(tableInfo.data) //return data when single table search
      {
        return tableInfo.data;
      }
      else if($isString(data))
      {
        return tableInfo[data].data;
      }else
      {
        return [];
      } 
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
    **/

  function setFieldValue(field, cdata){
    field = field.replace(/\((.*?)\)/,"|$1").split("|");

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
        var diff = field[1].split(',');
        return new Date(cdata[diff[0]]) - new Date(cdata[diff[1]]);
      }
    };

    return ((privateApi[field[0]] && !cdata.hasOwnProperty(field[0]))?privateApi[field[0]]() : cdata[field[0]]);
  }
   

   //set the object to be returned
   function setColumnData()
   {
      var odata = {},
          fnd = 0,
          _cLen = columns.length;
      while(_cLen--)
      {
        var aCol = columns[_cLen],
            fieldName,
            tCol,
            cData;


        //if fieldName contains table name
        if(expect(aCol).contains('.'))
        {
          var spltCol = aCol.split(".");
              tCol = $removeWhiteSpace(spltCol[0]);
              // split our required column on ' as '
              fieldName = spltCol[1].split(' as ');
              // set the data
              cData = data[d][tCol] || data[d];

              //AS Clause is required 
              if(expect(aCol).contains(' as '))
              {
                tCol = false;
              }
        }else
        {
          fieldName = aCol.split(' as ');
          cData = data[d];
        }

          // remove whiteSpace from our fieldName
          fieldName = JSON.parse($removeWhiteSpace(JSON.stringify(fieldName))) ;               

        var
            _as = fieldName.pop(),
            field =  fieldName.length?fieldName.shift():_as;

          //set the data
          if($isEqual(field,'*')){
            odata[_as] = cData;
          }else{
            odata[_as] = setFieldValue(field,cData);
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