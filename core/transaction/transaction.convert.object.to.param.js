 function transactionConvertObjectToParam(query){
    //whereClause query Accepts Object
    //Pass the parameter sent to the query
    if($isObject(query)){
      var objToStr = "",
          keys = Object.keys(query).length-1, //get keys length of the query Object
          inc = 0;
      //iterate through the Object
      //convert the name and value pairs to query string
      findInList.call(query,function(name,value){
          objToStr+=name+"='"+value+"'";
          if(keys > inc){
            objToStr+=" && ";
          }

          inc++;
      });

      //set the query to str
      query = objToStr;
    }


    return query;
}