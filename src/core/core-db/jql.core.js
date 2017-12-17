  //query string performer
  DBEvent.prototype.jQl = function(query, handler) {
      var taskType = $remArrayWhiteSpace(query.split(/(?:-)/gi), $remLastWhiteSpace),
          taskPerformerObj = customPlugins.$getAll(),
          task = taskType[0].toLowerCase();

      if (taskType && taskPerformerObj[task]) {
          return taskPerformerObj[task].fn(taskType, handler)(this);
      }

      return handler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
  };