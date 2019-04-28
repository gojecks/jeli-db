  //Function checks if data is a JSON
  //@return {OBJECT}
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

  //Function to retrieve storage Data
  //@return OBJECT
  function getStorageItem(item, db) {
      //return FN
      return privateApi.$getActiveDB(db).$get('_storage_').getItem(item);
  }

  //Function to Store storage data
  //@return JSON String
  function setStorageItem(key, value, db) {
      if (key && value && $isObject(value)) {
          privateApi.$getActiveDB(db)
              .$get('_storage_')
              .setItem(key, value);
      }
  }

  //@Function Delete Storage Item
  function delStorageItem(name) {
      privateApi.$getActiveDB().$get('_storage_').removeItem(name);
      return true;
  }

  function getDBSetUp(name) {
      return ({ started: new Date().getTime(), lastUpdated: new Date().getTime(), resourceManager: {}, lastSyncedDate: null });
  }

  /**
   * 
   * @param {*} ref 
   * @param {*} obj 
   */

  function updateDeletedRecord(ref, obj) {
      var checker = getStorageItem(privateApi.$delRecordName),
          _resolvers = privateApi.$getActiveDB(obj.db).$get('resolvers');
      if (checker && checker[obj.db]) {
          _resolvers.register('deletedRecords', checker[obj.db]);
      } else {
          //Create a new delete Object
          //add a new property : DB_NAME
          checker = {};
          checker[obj.db] = {};
      }

      //Update the resource control
      //only when its table
      var _delRecords = _resolvers.getResolvers('deletedRecords');
      switch (ref) {
          case ('table'):
              _delRecords[ref][obj.name] = obj._hash || GUID();
              /**
               * check if table was renamed earlier
               * remove it from th list
               */
              if (_delRecords['rename'][obj.name]) {
                  delete _delRecords['rename'][obj.name];
              }
              break;
          case ('rename'):
              _delRecords[ref][obj.oldName] = obj.newName;
              break;
          case ('database'):
              _delRecords[ref][obj.db] = obj._hash || GUID();
              break;
      }


      //extend the delete Object
      //with the current deleteResolver
      checker[obj.db] = _delRecords;
      setStorageItem(privateApi.$delRecordName, checker);
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

  var inUpdateProgress = 0;
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

      function recur(loop, seperator) {
          var h = "";
          for (var i = 0; i < loop; i++) {
              h += rand();
          }

          return h + (seperator || '');
      }

      return recur(2, "-") + recur(1, "-") + recur(1, "-") + recur(1, "-") + recur(3);
  }

  /**
   * 
   * @param {*} query 
   */
  function buildSelectQuery(query, entryPoint) {
      var definition = {};
      if (query.length > entryPoint) {
          if ($isString(query[entryPoint])) {
              // splice our query
              // set definition
              [].concat.call(query).splice(entryPoint).map(function(qKey) {
                  qKey = qKey.replace(/\((.*?)\)/, "~$1").split("~");
                  // function Query
                  if (qKey.length > 1) {
                      if ($isJsonString(qKey[1])) {
                          definition[qKey[0]] = JSON.parse(qKey[1]);
                      } else {
                          definition[qKey[0]] = qKey[1];
                      }

                  }
              });
          } else {
              return query[entryPoint];
          }
      }

      return definition;
  }

  function columnObjFn(columns) {
      var obj = {};

      function _dbDefaultValueMatcher(def) {
          if (def.hasOwnProperty('defaultValue')) {
              if (def.defaultValue == "CURRENT_TIMESTAMP") {
                  return +new Date;
              } else if (def.defaultValue == "user_defined") {
                  return def.userDefinedValue;
              } else {
                  return def.defaultValue;
              }
          }

          return null;
      };

      findInList.call(columns, function(idx, n) {
          obj[idx] = _dbDefaultValueMatcher(n);
      });

      return obj;
  }

  function jEliDeepCopy(data) {
      return JSON.parse(JSON.stringify(data));
  }

  //@Function Name jEliUpdateStorage
  //Updates the required Database
  function jEliUpdateStorage(dbName, tblName) {
      privateApi.$taskPerformer.updateDB.apply(privateApi.$taskPerformer, arguments);
  }

  /**
    DB event naming
  **/
  function eventNamingIndex(dbName, evName) {
      return "/event/" + dbName + "/" + evName;
  }