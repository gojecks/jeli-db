
    //$CustomEventHandler Function
  //Create Custom events that can be reused
  //anywhere within the application
  function $CustomEventHandler(type,defaultFn){
    if(!type){  type = 'on'};
    var handlers = ['on','emit'],
        _eventsQueue = {},
        _eventsObj  = function(){
             return ({
                    type : "",
                    registered : +new Date,
                    timestamp : +new Date,
                    isTrusted : true,
                    returnValue : true,
                    target:null,
                    defaultPrevented : false,
                    preventDefault : function(){
                      this.defaultPrevented  = true;
                    }
              });
          },
        _defaultFn = defaultFn || noop;

    this[type] = function(name,fn){
      if(!_eventsQueue[name]){
        _eventsQueue[name] = [];
      }
      _eventsQueue[name].push(fn);
    };

    this.$broadcast = function(name,arg){
      if(_eventsQueue[name]){
        var _events =  _eventsObj();
        _events.type = name;
        _events.timestamp = +new Date;
        _eventsQueue[name].forEach(function(fn){
            fn.apply(fn,[_events,arg]);
            if(!_events.defaultPrevented){
              _defaultFn(_events);
            }
        });
      }
    };

    this.$destroy = function(name){
      if(name && _eventsQueue[name]){
        delete _eventsQueue[name];
      }
    };
  }



  //jEli Encryption
  //@return Object {encrypt : decrypt}
  //@Objectives : Perform Encryption

  function buildLogic()
  {
      var str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=:?><*&%$#@!',
          len = 0,
          chArray = [],
          replace = [];

      while(len < str.length){
        chArray.push(str.charCodeAt(len++));
        replace.push( makeUID(2) );
      }

      return {
        charCode : chArray,
        replacer : replace
      };
  }

  function $encrypt()
  {
    var _logic = buildLogic();
    return ({
        encrypt : function(passer)
        {
          if(passer && passer.length)
          {
            var len = 0,
                encoded = "";
            while(len < passer.length)
            {
              encoded += _logic.replacer[_logic.charCode.indexOf(passer.charCodeAt(len++))];
            }

            return encoded;
          }

          return passer;
        },
        decrypt : function(passer)
        {
          if(passer && passer.length)
          {
            var spltPasser = passer.split(""),
                fakePasser = "",
                cnt=0,
                passer=[]; 
                //loop through and fix
                for(var v in spltPasser)
                { 
                  fakePasser +=spltPasser[v]; 
                  cnt++; 
                  if(cnt > 1)
                  { 
                      passer.push( String.fromCharCode( _logic.charCode[_logic.replacer.indexOf(fakePasser)] )); 
                      cnt=0; 
                      fakePasser="";
                  } 
                }
          }

          return passer.join("");
        }
    })
  }


  //BaseFn Factory
    function Base64Fn(){

      var publicApis = {};

      publicApis.encode = function b64EncodeUnicode(str) {
          return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
              return String.fromCharCode('0x' + p1);
          }));
      };

      publicApis.decode = function b64DecodeUnicode(str) {
          return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
      }

      return publicApis;
    }

  //generate GUID
  //xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  function GUID()
  {
      var rand = function(){ return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);}
      
      function recur(loop,seperator)
      {
          var h="";
          for(var i=0; i<loop; i++)
          {
              h +=rand();
          }

          return h + (seperator || '');
      }

      return recur(2,"-") + recur(1,"-") + recur(1,"-") + recur(1,"-") + recur(3);
  }

   //Expect Function
  function expect(objToInspect)
  {
      var inspectors = {
        contains : function(ins)
        {
          //Perform Object Check
          if($isObject(objToInspect))
          {
            return objToInspect.hasOwnProperty(ins) || (ins in objToInspect);
          }else
          {
            return objToInspect.indexOf(ins) > -1;
          }
        },
        search : function(str,callback)
        {
          var found = false;
          if($isObject(objToInspect))
          {
              for(var i in objToInspect)
              {
                if(callback && $isFunction(callback))
                {
                  if(callback(objToInspect[i],i))
                  {
                    found = objToInspect[i];
                  }
                }else
                {
                  if($isEqual(JSON.stringify(objToInspect[i]),JSON.stringify(str)))
                  {
                    found = objToInspect[i];
                  }
                }
              }
          }else
          {
            var len = objToInspect.length;
              while(len--)
              {
                  if(callback && $isFunction(callback))
                  {
                    if(callback(objToInspect[len],len))
                    {
                      found = objToInspect[len];
                    }
                  }
                  else
                  {
                    if($isEqual(JSON.stringify(objToInspect[len]),JSON.stringify(str))){
                      found = objToInspect[len];
                    }
                  }
              };
          }

          //return
          return found;
        }
      }

    return inspectors;
  }


  //Property Watch
    function defineProperty(obj,type,callBack)
    {
        //set watch on stack
        Object.defineProperty(obj, type, 
        {
            configurable: false,
            enumerable: false, // hide from for...in
            writable: false,
            value: callBack
        });
    }


    var inUpdateProgress = 0;
    function fireEvent(fn)
    {
      if(inUpdateProgress)
      {
        setTimeout(function()
        {
          inUpdateProgress = 0;
          fn();
        },1000);

        return;
      }
      fn();
      inUpdateProgress = 1;

    }
