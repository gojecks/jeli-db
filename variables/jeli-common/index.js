  /*** Common Method ***/
  /*** Methods are Private **/

  /*@Function stringToObject
  converts  valid JSON string to an Object
  values of each key can be determined by the replacerObj
  @Param : String str
  @Param : Object replacerObj

  It can only generate one level JSON not multi-dimensional 

  @return Object (new Object)
  */
  function stringToObject(str,replacerObj)
  {
    var splitedStr = str.split(''),
        newObj = {},
        j;
      splitedStr.pop();
      splitedStr.shift();
      splitedStr = splitedStr.join('').split(',');

      for(j in splitedStr)
      {
        var xSplitedStr = splitedStr[j].split(':'),
         value = $modelSetterGetter(xSplitedStr[1],replacerObj) || xSplitedStr[1];

         //set the value to the key Object
          newObj[xSplitedStr[0]] = value;
      }

    return newObj;
  }

    Function.prototype.construct = function(args)
    {
        var temp = Object.create(this.prototype),
            applied = this.apply(temp,args);

        return applied;
    };

    //watchBinding prototype function
    function watchBinding(){
      var _content = {};

      this.$get = function(id,mock){ 
        return _content[id] || mock || [];
      };

      this.$new = function(id,value){
         _content[id] = value; 
      };

      this.$remove = function(id){  
        if(_content[id]){ 
          delete _content[id];
        }
      };

      this.$push = function(id,value)
      { 
        if(!_content[id]){
          _content[id] = [];
        }
        //push all object
         _content[id].push( value );
      };

      this.$getAll = function(){
        return _content;
      };
    }


  function $isObject(obj)
  {
      return typeof obj === 'object' && obj instanceof Object && Object.prototype.toString.call(obj) === '[object Object]';
  };

  function $isString(str)
  {
      return typeof str === 'string' && new String(str) instanceof String;
  }

  function $isJsonString(str)
  {
    return str && str.split('')[0] === '{' && str.split('')[str.split('').length-1] === '}';
  }

  function $isEmptyObject (obj)
  {
    return (!$isObject(obj) && !$countObject(obj));
  }

  function $isNumber(n)
  {
      return Number(n) === n && n % 1 === 0;
  }

  function $isFloat(n){
      return Number(n) === n && n % 1 !== 0;
  }

  function $isDouble(n){
    return parseFloat(n) > 0;
  }

  function $isArray(obj)
  {
      return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function $isFunction(fn)
  {
      return typeof fn === 'function';
  }

  function $countObject(obj)
  {
      return Object.keys(obj);
  }

  function $isUndefined(val)
  {
      return typeof val === 'undefined';
  }

  function $isDefined(val){
    return  typeof val !== 'undefined';
  }

  //check for null attribute

  function $isNull(val)
  {
      return null === val;
  }

  //check for empty value
  function $isEmpty(val)
  {
      return val === "";
  }

  function $isEqual(a,b)
  {
      return a === b;
  }

  function $inArray(a,b)
  {
    return  b.indexOf(a) > -1;
  }

    /*
    @Function serialize object to string
    @Argument (OBJECT)
    @return Query Param eg(foo=bar&bar=foo)
  */

  function serialize(obj)
  {
      if ($isUndefined(obj)) return;

      var param = [],
        buildParams = function(prefix,dn)
        {
          if($isArray(dn))
          {
            domElementProvider.each(dn,function(i,n)
            {
              if((/\[\]$/).test(prefix))
              {
                add(prefix,n);
              }else
              {
                buildParams(prefix+"["+($isObject(n)?prefix :"")+"]",n)
              }
            });
          }else if($isObject(dn))
          {
            for(var name in dn)
            {
              buildParams(prefix+"["+name+"]",dn[name]);
            }
          }else
          {
            add(prefix,dn);
          }
        },
        add = function(key,value)
        {
          value = $isFunction(value)?value():($isEmpty(value)?"":value);
          param[param.length] = encodeURIComponent(key) +'='+encodeURIComponent(value);
        };

        if ($isArray(obj) && $isObject(obj))
        {
            domElementProvider.each(obj, function (i, n)
            {
              add(i,n)
            });
        }else
        {
          for(var name in obj)
          {
            buildParams(name,obj[name]);
          }
        }

      return param.join("&").replace(/%20/g,'+');
  }

  //@Function unSerialize
    function unSerialize(par)
    {
      var ret = {};
      if(!$isUndefined(par))
      {
        var pairs = par.split("&"),
          i;
        for(i in pairs)
        {
          var splitPairs = pairs[i].split('=');
          ret[splitPairs[0]] = splitPairs[1]
        }
      }

      return ret;
    }

  //@Function Make ID
  function makeUID(e)
  {
    var h = '';
    var f = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var g = 0; g < e; g++) {
      h += f.charAt(Math.floor(Math.random() * f.length))
    }
    return h
  }

  //element ref ID
  function getUID()
  {
    return '$$ele:'+$eUID++;
  }

  //@Function parseJSON
  function parseJSON(string) 
  {
      if (!$isString(string) || !string) return null;

      string = trim(string);
      return $isSupport.jsonParser ? JSON.parse(JSON.stringify(string))  : (new Function('return ' + string)) ();
  }

  //@Function xmlParser

  function parseXML(text) 
  {
      if ($isSupport.DOMParser)
      {
          return new DOMParser().parseFromString(text, 'text/xml');
      }else
      {
          var xml = new ActiveXObject('Microsoft.XMLDOM');
            xml.async = 'false';
            xml.loadXML(text);
            return xml;
      }
  }

  //@Function extend
    function extend(ret, source, replacer) 
    {
      ret = ret || {};
      if (!$isUndefined(replacer))
      {
        return extend(extend(ret, source), replacer);
      }

      for(var name in source){
        if(source.hasOwnProperty(name)){
          //set the value
            ret[name] = source[name];
        }
      }

      return ret;
    }

  //function to buildErrors
  function errorBuilder( str )
  {
      throw new Error( str );
  }


  function camelCase()
  {
      return this.replace(/^([A-Z])|[\s-_](\w)/g, function(match, p1, p2, offset) {
          if (p2){ return p2.toUpperCase(); } 
          return p1.toLowerCase();        
      });
  }

    //function deleteAndReStructure
    function deleteAndReStructure(arr,index)
    {
      var temp = [],
          i=0;
      if($isArray(arr))
      {
        for(;i< arr.length; i++)
        {
          if(i !== index)
          {
            temp.push( arr[i] );
          }
        }
      }

      return temp;
    }

    function findInList(fn)
    {
        var found = false,checker;
        for(var i in this)
        {
            checker = fn(i,this[i]);
           if(checker)
           {
                found = checker;
           }
        }

        return found;
    }


    function domElementLoop(loop, callback)
    {
        var last = loop.length-1,
            i = 0;
        while(last>=i)
        {
          var val = callback(loop[i],i);
          if (val === false)
          {
            break;
          }
          i++;
        }
    }

    function $removeWhiteSpace(str)
    {
        return (str || '').replace(/\s+/g, '');
    }

    function removeSingleQuote(str)
    {
      if($isBooleanValue.indexOf(str) > -1 || $isUndefined(str)) return str;
      
      return str.replace(/[']/g, "");
    }

    function $remArrayWhiteSpace(arr,fn)
    {
      var nArr = [];
      if(arr && arr.length)
      {
        arr.filter(function(item,idx)
        {
          if(item)
          {
            nArr.push((fn)?fn(item):$removeWhiteSpace(item));
          }
          
        });
        
      }

      return nArr;
    }

      //remove last white space in a string
    function $remLastWhiteSpace(str)
    {
      return ($isEqual(str.slice(str.length-1)," "))?str.slice(0,str.length-1):str;
    }

