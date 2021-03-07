  /**
   * 
   * @param {*} query 
   * @param {*} handler 
   * @param {*} parser 
   */
  function ApplicationInstanceJQL(query, handler, parser) {
      var _this = this;
      var taskType = query.split(/\s+(?:-)/gi)
          .map(function(key) {
              return _this.jQl.parser(key, parser || {});
          })
          .map(function(a) { a = a.trim(); return $isJsonString(a) ? JSON.parse(a) : a; });
      var task = taskType[0].toLowerCase();
      var taskPerformerObj = customPlugins.get(task),

          /**
           * pardon failed handler definition
           */
          handler = handler || {};
      handler.onSuccess = handler.onSuccess || function() {};
      handler.onError = handler.onError || function() {};

      if (taskType && taskPerformerObj) {
          if (taskPerformerObj.disabled) {
              return handler.onError(dbErrorPromiseObject("command is diabled, to use command please enable it."));
          }


          if (taskPerformerObj.requiresParam && taskType.length === 1) {
              return handler.onError(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
          }

          try {
              taskPerformerObj.fn(taskType, handler)(this);
          } catch (e) {
              handler.onError(e);
          } finally {}

          return;
      }

      return handler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
  };

  /**
   * 
   * @param {*} query 
   * @param {*} replacer 
   */
  ApplicationInstanceJQL.parser = function(query, replacer) {
      function stringfy(val) {
          return typeof val === "object" ? JSON.stringify(val) : val;
      }

      return query.replace(/\%(.*?)\%/g, function(a, key) {
          return replacer.hasOwnProperty(key) ? stringfy(replacer[key]) : key;
      })
  };