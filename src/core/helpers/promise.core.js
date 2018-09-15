  /**
   * 
   * @param {*} ret 
   * @param {*} objStore 
   */
  function sqlResultExtender(ret, objStore) {
      if ($isObject(ret)) {
          switch (ret.state) {
              case ('select'):
                  ret.jDBNumRows = function() {
                      return objStore.length;
                  };
                  ret.getRow = function(row) {
                      return objStore[row];
                  };
                  ret.getResult = function() {
                      return objStore;
                  }
                  ret.first = function() {
                      return objStore[0];
                  };
                  ret.openCursor = function(fn) {
                      var start = 0,
                          cursorEvent = ({
                              result: {
                                  value: [],
                              },
                              continue: function() {
                                  //increment the start cursor point
                                  if (objStore.length > start) {
                                      cursorEvent.result.value = objStore[start];
                                      start++;
                                      fn(cursorEvent);
                                  }

                              },
                              prev: function() {
                                  //decrement the start point
                                  if (start) {
                                      start--;
                                  }

                                  cursorEvent.continue();
                              },
                              index: function() {
                                  return start;
                              }
                          });

                      //initialize the cursor event
                      cursorEvent.continue();
                  };
                  ret.limit = function(start, end) {
                      return copy(objStore).splice(start, end);
                  };
                  break;
              case ('insert'):
                  ret.lastInsertId = function() {
                      return tableInfo.lastInsertId;
                  };
                  ret.result = objStore;
                  break;
              default:
                  ret.result = objStore;
                  break;
          }
      }

      return ret;
  }

  function dbSuccessPromiseObject(state, message) {
      return ({ state: state, status: "success", result: { message: message }, code: 200 });
  }

  function dbErrorPromiseObject(message) {
      return ({ message: message, status: "error", code: 400 });
  }

  //DB Promise
  function DBPromise(defer, upgradeneeded) {
      if (defer) {
          //onSuccess State
          this.onSuccess = function(fn) {
              //set the defer state
              defer.then(fn);

              return this;
          };

          this.onError = function(fn) {
              //set the error state
              defer.catch(fn);

              return this;
          };

          this.then = function(done, fail) {
              defer.then(done, fail);

              return this;
          };

      }
  }