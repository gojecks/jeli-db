  /*** Common Method ***/
  /*** Methods are Private **/


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
  function $isObject(obj) {
      return typeof obj === 'object' && obj instanceof Object && Object.prototype.toString.call(obj) === '[object Object]';
  };

  /**
   * 
   * @param {*} str 
   */
  function $isString(str) {
      return typeof str === 'string' && new String(str) instanceof String;
  }

  /**
   * 
   * @param {*} str 
   */
  function $isJsonString(str) {
      return (str && $isString(str) && ("{[".indexOf(str.charAt(0)) > -1) && ("}]".indexOf(str.charAt(str.length - 1)) > -1));
  }

  function noop() {
      return null;
  }

  /**
   * 
   * @param {*} obj 
   */
  function $isEmptyObject(obj) {
      return ($isObject(obj) && !$countObject(obj));
  }

  /**
   * 
   * @param {*} n 
   */
  function $isNumber(n) {
      return Number(n) === n && n % 1 === 0;
  }

  /**
   * 
   * @param {*} n 
   */
  function $isFloat(n) {
      return Number(n) === n && n % 1 !== 0;
  }

  /**
   * 
   * @param {*} n 
   */
  function $isDouble(n) {
      return parseFloat(n) > 0;
  }

  /**
   * 
   * @param {*} obj 
   */
  function $isArray(obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function $isEmptyObject(obj) {
      return obj && !$countObject(obj).length;
  }
  /**
   * 
   * @param {*} fn 
   */
  function $isFunction(fn) {
      return typeof fn === 'function';
  }

  /**
   * 
   * @param {*} obj 
   */
  function $countObject(obj) {
      return Object.keys(obj);
  }
  /**
   * 
   * @param {*} bool 
   */
  function $isBoolean(bool) {
      return Object.prototype.toString.call(bool) === '[object Boolean]';
  }

  /**
   * 
   * @param {*} val 
   */
  function $isUndefined(val) {
      return typeof val === 'undefined';
  }

  /**
   * 
   * @param {*} val 
   */
  function $isDefined(val) {
      return typeof val !== 'undefined';
  }

  //check for null attribute
  /**
   * 
   * @param {*} val 
   */
  function $isNull(val) {
      return null === val;
  }

  //check for empty value
  /**
   * 
   * @param {*} val 
   */
  function $isEmpty(val) {
      return val === "";
  }

  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */
  function $isEqual(a, b) {
      return a === b;
  }

  /**
   * 
   * @param {*} a 
   * @param {*} b 
   */
  function $inArray(a, b) {
      return ($isString(b) || $isArray(b)) && b.indexOf(a) > -1;
  }

  /**
   * 
   * @param {*} arr 
   */
  function noDubs(arr) {
      return arr.reduce(function(all, item, index) {
          if (arr.indexOf(arr[index]) === index) {
              all.push(item)
          }
          return all
      }, []);
  }

  /**
   * 
   * @param {*} str 
   */
  function jSonParser(str) {
      if ($isJsonString(str)) {
          try {
              str = JSON.parse(str.replace(/[\']/g, '"'));
          } catch (e) {}
      }
      return str;
  }

  /**
   * 
   * @param {*} to 
   * @param {*} from 
   */
  function copyFrom(to, from) {
      for (var key in to) {
          if (from.hasOwnProperty(key)) {
              if (typeof to[key] === "object") {
                  to[key] = copyFrom(to[key], from[key]);
              } else {
                  to[key] = from[key];
              }
          }
      }

      return to;
  }

  //@Function extend
  function extend() {
      var extended = {},
          deep = $isBoolean(arguments[0]),
          i = 0,
          length = arguments.length;

      if (deep) {
          i++;
          deep = arguments[0];
      }

      // check if source is Array or Object
      if ($isArray(arguments[i]) && !$isObject(arguments[i + 1])) {
          extended = Array(arguments[i].length);
      }

      var merger = function(source) {
          for (var name in source) {
              if (source.hasOwnProperty(name)) {
                  if (deep && $isObject(source[name]) && !$isEmptyObject(source[name])) {
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

      if ($isString(error)) {
          throw new userException(error);
      } else {
          console.error(error);
      }
  }


  function camelCase() {
      return this.replace(/^([A-Z])|[\s-_](\w)/g, function(match, p1, p2, offset) {
          if (p2) { return p2.toUpperCase(); }
          return p1.toLowerCase();
      });
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
  function $removeWhiteSpace(str) {
      str = (str || '')
      if (/["']/g.test(str)) {
          return str
      }
      return str.replace(/\s+/g, '');
  }

  var $isBooleanValue = 'true | false | 1 | 0';

  /**
   * 
   * @param {*} str 
   */
  function removeSingleQuote(str) {
      if ($isBooleanValue.indexOf(str) > -1 || $isUndefined(str)) return str;

      return String(str).replace(/[']/g, "");
  }
  /**
   * 
   * @param {*} arr 
   * @param {*} fn 
   */
  function $remArrayWhiteSpace(arr, fn) {
      var nArr = [];
      if (arr && arr.length) {
          arr.forEach(function(item, idx) {
              if (item) {
                  nArr.push((fn) ? fn(item) : $removeWhiteSpace(item));
              }
          });
      }

      return nArr;
  }

  /**
   * remove last white space in a string
   * @param {*} str 
   */
  function $remLastWhiteSpace(str) {
      return trim(str);
  }

  // removeSingle Operand
  /**
   * 
   * @param {*} str 
   * @param {*} matcher 
   * @param {*} replacer 
   * @param {*} flags 
   */
  function removeSingleOperand(str, matcher, replacer, flags) {
      return str.replace(new RegExp(matcher, flags), function(s, n, t) {
          if ((t.charAt(n + 1) === s && t.charAt(n - 1) !== s) || (t.charAt(n + 1) !== s && t.charAt(n - 1) === s)) {
              return s;
          } else {
              return replacer;
          }

      });
  }

  /**
   * 
   * @param {*} str 
   */
  function removeQuotesFromString(str) {
      if (str.charAt(0).match(/['"]/) && str.charAt(str.length - 1).match(/['"]/)) {
          return str.substr(1, str.length - 2);
      }

      return str;
  }

  /**
   * string to hashCode
   * @param {*} code 
   */
  function $hashCode(code) {
      var hash = 0,
          i, chr, len;
      if (!code || code.length === 0) return hash;
      for (i = 0, len = code.length; i < len; i++) {
          chr = code.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
      }

      return hash;
  }

  function jsonDiff(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
  }