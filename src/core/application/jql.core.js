  /**
   * 
   * @param {*} tasks 
   * @param {*} handler 
   * @param {*} params 
   */
  function DatabaseInstanceJQL(tasks, handler, params) {
      if (handler) {
          console.warn('Support for handler is deprecated and will be removed in next release.');
      }

      handler = handler || {};
      return new Promise((resolve, reject) => {
          handler.onSuccess = handler.onSuccess || resolve;
          handler.onError = handler.onError || reject;
          /**
           * convert to tasks to allow
           */
          if (Array.isArray(tasks)) {
              tasks = tasks.filter(function(task) { return !!task; });
              startMultipleTask(this);
          } else {
              performTask(tasks, handler, this);
          }
      });
      
      /**
       * 
       * @param {*} taskToPerform 
       * @param {*} taskPerformerHandler 
       * @param {*} context 
       */
      function performTask(taskToPerform, taskPerformerHandler, context) {
          var taskType = queryParser(taskToPerform, params);
          var task = taskType[0].toLowerCase();
          var taskPerformerObj = Database.plugins.get(task);

          /**
           * pardon failed handler definition
           */

          if (taskType && taskPerformerObj) {
              if (taskPerformerObj.disabled) {
                  taskPerformerHandler.error(dbErrorPromiseObject("command is disabled, to use command please enable it."));
              } else if (taskPerformerObj.requiresParam && taskType.length === 1) {
                  taskPerformerHandler.error(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
              } else {
                  try {
                      taskPerformerObj.fn(taskType, taskPerformerHandler)(context);
                  } catch (e) {
                      taskPerformerHandler.onError(e);
                  }
              }
          } else {
              taskPerformerHandler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
          }
      }
      /**
       * 
       * @param {*} context 
       */
      function startMultipleTask(context) {
          var index = 0;
          var taskPerformerHandler = Object({
              onSuccess: next(1),
              onError: next(0)
          });
          var responses = [];

          function next(pos) {
              return function(res) {
                  index++;
                  if (!pos) {
                      responses.length = 0;
                      handler.onError(res);
                  } else {
                      responses.push(res);
                      if (tasks.length > index) {
                          performTask(tasks[index], taskPerformerHandler, context);
                      } else {
                          handler.onSuccess(responses);
                      }
                  }
              }
          }
          
          performTask(tasks[index], taskPerformerHandler, context);
      }

  };