  /*** Common Method ***/
  /*** Methods are Private **/
  var window = Object.defineProperties({}, {
      location: {
          get: function() {
              return (location || { host: null });
          }
      },
      onfocus: {
          set: function(fn) {
              if (window) {
                  window.onfocus = fn;
              }
          }
      }
  });

  //@Function trim
  var trim = ''.trim ? function(s) { return s.trim(); } : function(s) {
      return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  };


  /**
   * converts  valid JSON string to an Object
   * values of each key can be determined by the replacerObj
   *  It can only generate one level JSON not multi-dimensional 
   * 
   * @param {*} str 
   * @param {*} replacerObj 
   * 
   * @return Object (new Object)
   */
  function stringToObject(str, replacerObj) {
      var newObj;
      try {
          newObj = maskedEval(str, replacerObj || {});
      } catch (e) {
          var splitedStr = str.match(new RegExp("\\" + str.charAt(0) + "(.*?)" + "\\" + str.charAt(str.length - 1))),
              newObj = (("{" === str.charAt(0)) ? {} : []);

          splitedStr = (splitedStr && splitedStr[1] || '').split(',');

          for (var j in splitedStr) {
              var xSplitedStr = splitedStr[j].split(':'),
                  name = xSplitedStr.shift(),
                  value = maskedEval(xSplitedStr.join(':'), replacerObj || {}) || xSplitedStr[1];

              //set the value to the key Object
              newObj[name] = value;
          }
      }

      return newObj;
  }

  /**
   * 
   * @param {*} obj 
   */
  function isobject(obj) {
      return typeof obj === 'object' && obj instanceof Object && Object.prototype.toString.call(obj) === '[object Object]';
  };

  /**
   * 
   * @param {*} str 
   */
  function isstring(str) {
      return typeof str === 'string' && new String(str) instanceof String;
  }

  /**
   * 
   * @param {*} str 
   */
  function isjsonstring(str) {
      return (str && isstring(str) && ("{[".indexOf(str.charAt(0)) > -1) && ("}]".indexOf(str.charAt(str.length - 1)) > -1));
  }

  function noop() {
      return null;
  }

  /**
   * 
   * @param {*} n 
   */
  function isnumber(n) {
      return Number(n) === n && n % 1 === 0;
  }

  /**
   * 
   * @param {*} n 
   */
  function isfloat(n) {
      return Number(n) === n && n % 1 !== 0;
  }

  /**
   * 
   * @param {*} n 
   */
  function isdouble(n) {
      return parseFloat(n) > 0;
  }

  /**
   * 
   * @param {*} obj 
   */
  function isarray(obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function isemptyobject(obj) {
      return obj && !objectValues(obj).length;
  }
  /**
   * 
   * @param {*} fn 
   */
  function isfunction(fn) {
      return typeof fn === 'function';
  }

  /**
   * 
   * @param {*} obj 
   */
  function objectValues(value) {
      return Object.keys(value);
  }
  /**
   * 
   * @param {*} bool 
   */
  function isboolean(bool) {
      return Object.prototype.toString.call(bool) === '[object Boolean]';
  }

  /**
   * 
   * @param {*} val 
   */
  function isundefined(val) {
      return typeof val === 'undefined';
  }

  /**
   * 
   * @param {*} val 
   */
  function isdefined(val) {
      return typeof val !== 'undefined';
  }

  //check for null attribute
  /**
   * 
   * @param {*} val 
   */
  function isnull(val) {
      return null === val;
  }

  //check for empty value
  /**
   * 
   * @param {*} val 
   */
  function isempty(val) {
      return val === "";
  }

  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */
  function isequal(a, b) {
      return a === b;
  }

  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */
  function inarray(a, b) {
      return (isstring(b) || isarray(b)) && b.indexOf(a) > -1;
  }

  /**
   * 
   * @param {*} str 
   */
  function jSonParser(str) {
      if (isjsonstring(str)) {
          try {
              str = JSON.parse(str.replace(/[\']/g, '"'));
          } catch (e) {}
      }
      return str;
  }

  //@Function extend
  function extend() {
      var extended = {},
          deep = isboolean(arguments[0]),
          i = 0,
          length = arguments.length;

      if (deep) {
          i++;
          deep = arguments[0];
      }

      // check if source is Array or Object
      if (isarray(arguments[i]) && !isobject(arguments[i + 1])) {
          extended = Array(arguments[i].length);
      }

      var merger = function(source) {
          for (var name in source) {
              if (source.hasOwnProperty(name)) {
                  if (deep && isobject(source[name]) && !isemptyobject(source[name])) {
                      extended[name] = extend(true, extended[name], source[name]);
                  } else {
                      //set the value
                      extended[name] = source[name];
                  }
              }
          }
      };

      // Loop through each object and conduct a merge
      for (; i < length; i++) {
          merger(arguments[i]);
      }

      return extended;
  }

  /**
   * 
   * @param {*} item 
   * @param {*} deep 
   */
  function copy(item, deep) {
      var type = {};
      if (Object.prototype.toString.call(item) === '[object Array]') {
          type = [];
      }

      if (item && item.nodeType) return item.cloneNode(true); // Node
      if (typeof item === 'object' && !deep) return item;
      if (item instanceof Date) return new Date(item.getTime());
      if (item instanceof RegExp) return new RegExp(item);
      if (typeof item !== "object") return item;

      if (deep) {
          var ret;
          try {
              ret = JSON.parse(JSON.stringify(item))
          } catch (e) {
              ret = extend(true, item);
          }

          return ret;
      }

      return extend(type, item);
  }

  /**
   * 
   * @param {*} error 
   */
  function errorBuilder(error) {
      function userException() {
          this.name = "jEliException";
          this.message = error;
      }

      userException.prototype.toString = function() {
          return this.name + ': "' + this.message + '"';
      };

      if (isstring(error)) {
          throw new userException(error);
      } else {
          console.error(error);
      }
  }

  /**
   * 
   * @param {*} fn 
   */
  function findInList(fn) {
      var found = false,
          checker;
      for (var i in this) {
          checker = fn(i, this[i]);
          if (checker) {
              found = checker;
          }
      }

      return found;
  }

  /**
   * 
   * @param {*} str 
   */
  function removewhitespace(str) {
      str = (str || '')
      if (/["']/g.test(str)) {
          return str
      }
      return str.replace(/\s+/g, '');
  }

  var isbooleanValue = 'true | false | 1 | 0';

  /**
   * 
   * @param {*} str 
   */
  function removeSingleQuote(str) {
      if ($isBooleanValue.indexOf(str) > -1 || isundefined(str)) return str;

      return String(str).replace(/[']/g, "");
  }

  function jsonDiff(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
  }