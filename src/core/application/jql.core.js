  /**
   * 
   * @param {*} tasks 
   * @param {*} handler 
   * @param {*} params 
   */
  function ApplicationInstanceJQL(tasks, handler, params) {
      if (handler) {
          console.warn('Support for handler is deprecated and will be removed in next release.');
      }
      var _this = this;
      handler = handler || {};
      return new DBPromise(function(resolve, reject) {
          handler.onSuccess = handler.onSuccess || resolve;
          handler.onError = handler.onError || reject;
          /**
           * convert to tasks to allow
           */
          if (Array.isArray(tasks)) {
              tasks = tasks.filter(function(task) { return !!task; });
              startMultipleTask();
          } else {
              performTask(tasks, handler);
          }
      });
      /**
       * 
       * @param {*} taskToPerform 
       * @param {*} taskPerformerHandler 
       */
      function performTask(taskToPerform, taskPerformerHandler) {
          var taskType = ApplicationInstanceJQL.parser(taskToPerform, params);
          var task = taskType[0].toLowerCase();
          var taskPerformerObj = Database.plugins.get(task);

          /**
           * pardon failed handler definition
           */

          if (taskType && taskPerformerObj) {
              if (taskPerformerObj.disabled) {
                  taskPerformerHandler.error(dbErrorPromiseObject("command is diabled, to use command please enable it."));
              } else if (taskPerformerObj.requiresParam && taskType.length === 1) {
                  taskPerformerHandler.error(dbErrorPromiseObject("command requires parameters but got none,\n type help -[command]"));
              } else {
                  try {
                      taskPerformerObj.fn(taskType, taskPerformerHandler)(_this);
                  } catch (e) {
                      taskPerformerHandler.onError(e);
                  } finally {}
              }
          } else {
              taskPerformerHandler.onError(dbErrorPromiseObject("Invalid command passed, use -help for help"));
          }
      }

      function startMultipleTask() {
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
                          performTask(tasks[index], taskPerformerHandler);
                      } else {
                          handler.onSuccess(responses);
                      }
                  }
              }
          }
          performTask(tasks[index], taskPerformerHandler);
      }

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

      return query.split(/\s+(?:-)/gi)
          .map(function(key) {
              return key.replace(/\%(.*?)\%/g, function(a, key) {
                  return replacer.hasOwnProperty(key) ? stringfy(replacer[key]) : key;
              });
          })
          .map(function(a) { return jSonParser(a.trim()); });
  };