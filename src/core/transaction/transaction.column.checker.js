  //columnTypeChecker
  function transactionColumnTypeChecker(data,requiredType,mtype)
  {
        var type = typeof data,
            retType = false;

        switch(requiredType)
        {
          case('varchar'):
          case('text'):
          case('string'):

            if($isEqual(type,'string'))
            {
              retType = type;
            }

          break;
          case('number'):
          case('integer'):
          case('int'):
          case("smallint"):
          case("bigint"):
            if($isNumber(data) || !isNaN(Number(data)))
            {
              retType = type;
            }
          break;
          case("double"):
          case("decimal"):
          case("long"):
            if($isDouble(data)){
              retType = type;
            }
          break;
          case('boolean'):
            if(!isNaN(Number(data))){
              retType = type;
            }
          break;
          case("float"):
            if($isFloat(data)){
              retType = type;
            }
          break;
          case('datetime'):
          case("timestamp"):
          case("date"):
            if(new Date(data) instanceof Date)
            {
              retType = requiredType;
            }
          break;
          case('object'):
          case('array'):
          case('blob'):
            if($isObject(data) || $isArray(data) || $isString(data)){
              retType = requiredType;
            }
          break;
          case('any'):
            retType = type;
          break;
        }



      return retType;
  }