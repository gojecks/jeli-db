  //Function checks if data is a JSON
  //@return {OBJECT}
  var inUpdateProgress = 0;

  function purifyJSON(data) {
      if ($isJsonString(data)) {
          return JSON.parse(data);
      } else {
          return undefined;
      }
  }

  //condition setter
  function setCondition(spltQuery) {
      return jSonParser(spltQuery.slice(parseInt(spltQuery.indexOf("where") + 1)).join(''));
  }

  function getDBSetUp() {
      return ({
          started: new Date().getTime(),
          lastUpdated: new Date().getTime(),
          resourceManager: {},
          lastSyncedDate: null
      });
  }

  //Property Watch
  /**
   * 
   * @param {*} obj 
   * @param {*} type 
   * @param {*} callBack 
   */
  function defineProperty(obj, type, callBack) {
      //set watch on stack
      Object.defineProperty(obj, type, {
          configurable: false,
          enumerable: false, // hide from for...in
          writable: false,
          value: callBack
      });
  }
  /**
   * 
   * @param {*} fn 
   */
  function fireEvent(fn) {
      if (inUpdateProgress) {
          setTimeout(function() {
              inUpdateProgress = 0;
              fn();
          }, 1000);

          return;
      }
      fn();
      inUpdateProgress = 1;
  }

  //generate GUID
  //xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  function GUID() {
      var rand = function() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
      return [2, 1, 1, 3].map(function(loop) {
          var h = "";
          for (var i = 0; i < loop; i++) {
              h += rand();
          }
          return h;
      }).join('-');
  }

  /**
   * 
   * @param {*} weight 
   * @returns 
   */
  function randomStringGenerator(weight) {
      var s = '';
      var from = 'abcdefghijklmnnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ00123456789';
      for (var i = 0; i < weight; i++) {
          s += from.charAt(Math.floor(Math.random() * from.length));
      }

      return s;
  }

  function jEliDeepCopy(data) {
      return JSON.parse(JSON.stringify(data));
  }