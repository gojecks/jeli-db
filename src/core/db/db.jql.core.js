  //query string performer
  /**
   * 
   * @param {*} query 
   * @param {*} handler 
   * @param {*} parser 
   */
  ApplicationInstance.prototype.jQl = function(query, handler, parser) {
      var _this = this,
          taskType = query.split(/\s+(?:-)/gi)
          .map(function(key) {
              return _this.jQl.parser(key, parser || {});
          })
          .map(function(q) { return q.trim(); })
          .map(function(a) { try { return JSON.parse(a); } catch (e) {}; return a; }),
          taskPerformerObj = customPlugins.$getAll(),
          task = taskType[0].toLowerCase();
      /**
       * pardon failed handler definition
       */
      handler = handler || {};
      handler.onSuccess = handler.onSuccess || function() {};
      handler.onError = handler.onError || function() {};

      if (taskType && taskPerformerObj[task]) {
          if (taskPerformerObj[task].disabled) {
              return handler.onError(dbErrorPromiseObject("command is diabled, to use command please enable it."));
          }


          if (taskPerformerObj[task].requiresParam && taskType.length === 1) {
              return handler.onError(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
          }

          try {
              taskPerformerObj[task].fn(taskType, handler)(this);
          } catch (e) {
              handler.onError(e);
          } finally {}

          return;
      }

      return handler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
  };



  ApplicationInstance.prototype.jQl.parser = function(query, replacer) {
      function stringfy(val) {
          return typeof val === "object" ? JSON.stringify(val) : val;
      }

      return query.replace(/\%(.*?)\%/g, function(a, key) {
          return replacer.hasOwnProperty(key) ? stringfy(replacer[key]) : key;
      })
  };