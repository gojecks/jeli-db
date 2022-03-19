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
  function DBPromise(callback, extension) {
      var _catchCallback = function(e) { console.error(e) };
      var defer = {
          success: [],
          error: [],
          state: {
              pending: true,
              value: undefined
          }
      };
      var noop = function() {};

      /**
       * 
       * @param {*} code 
       * @returns 
       */
      function trigger(code) {
          return function(response) {
              defer.state.pending = false;
              defer.state.value = response;
              defer.state.resolvedWith = code;
              while (defer[code].length) {
                  call(defer[code].shift());
              }
          }
      }

      /**
       * 
       * @param {*} fn 
       */
      function call(fn) {
          defer.state.value = (fn || noop)(defer.state.value);
      }

      /**
       * 
       * @param {*} type 
       * @param {*} fn 
       */
      function commitOrTrigger(type, fn) {
          if (!defer.state.pending) {
              if (type === defer.state.resolvedWith) {
                  call(fn);
              }
          } else {
              defer[type].push(fn);
          }
      }

      //onSuccess State
      this.onSuccess = function(fn) {
          commitOrTrigger('success', fn);
          return this;
      };

      this.onError = function(fn) {
          commitOrTrigger('error', fn);
          return this;
      };

      this.then = function(done, fail) {
          this.onSuccess(done);
          this.onError(fail);
          return this;
      };

      this.catch = function(catchFn) {
          _catchCallback = catchFn;
      };

      // register extension if passed
      if (extension) {
          for (var action in extension) {
              this[action] = extension[action];
          }
      }

      if (callback) {
          try {
              callback(trigger('success'), trigger('error'));
          } catch (e) {
              _catchCallback(e);
          }
      } else {
          throw Error('DBPromise requires a callback method');
      }
  }

  DBPromise.extension = function(callback, events) {
      var eventRegistry = {};
      /**
       * 
       * @param {*} event 
       * @returns 
       */
      this.handlers = (events || []).reduce(function(acc, event) {
          acc[event] = registry(event);
          eventRegistry[event] = [];
          return acc;
      }, {});

      function registry(event) {
          return function(fn) {
              eventRegistry[event].push(fn || callback);
              return this;
          };
      }

      this.call = function(eventName, args) {
          if (eventRegistry[eventName] && eventRegistry[eventName].length) {
              while (eventRegistry[eventName].length) {
                  eventRegistry[eventName].shift().apply(null, args);
              }
          } else {
              callback.apply(null, args);
          }
      };
  };