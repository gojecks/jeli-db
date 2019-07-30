  /**
   * 
   * @param {*} state 
   * @param {*} message 
   */
  function dbSuccessPromiseObject(state, message) {
      return ({ state: state, status: "success", result: { message: message }, code: 200 });
  }

  /**
   * 
   * @param {*} message 
   */
  function dbErrorPromiseObject(message) {
      return ({ message: message, status: "error", code: 400 });
  }

  /**
   * 
   * @param {*} defer 
   */
  function DBPromise(defer) {
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