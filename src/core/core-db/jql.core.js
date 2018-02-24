  //query string performer
  DBEvent.prototype.jQl = function(query, handler, parser) {
      var taskType = $remArrayWhiteSpace(this.jQl.parser(query, parser || {}).split(/(?:-)/gi), $remLastWhiteSpace),
          taskPerformerObj = customPlugins.$getAll(),
          task = taskType[0].toLowerCase();

      if (taskType && taskPerformerObj[task]) {
          if (taskPerformerObj[task].requiresParam && taskType.length === 1) {
              return handler.onError(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
          }

          return taskPerformerObj[task].fn(taskType, handler)(this);
      }

      return handler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
  };



  DBEvent.prototype.jQl.parser = function(query, replacer) {
      return query.replace(/\%(.*?)\%/g, function(a, key) {
          return replacer.hasOwnProperty(key) ? replacer[key] : key;
      })
  };