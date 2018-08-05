  /**
   * 
   * @param {*} appName 
   * @param {*} deleteRecords 
   * @param {*} serverResource 
   */
  function deleteSyncState(appName, deleteRecords, serverResource) {
      var setMessage = syncHelper.process.getProcess(appName).getSet('onMessage');
      /**
       * 
       * @param {*} task 
       * @param {*} res 
       */
      function cleanUp(task, res) {
          var _delRecordManager = getStorageItem($queryDB.$delRecordName, appName),
              _resData = res.data.renamed || res.data.removed,
              _totalTask = Object.keys(deleteRecords[task]),
              _inc = 0,
              _isDataBaseTask = $isEqual('database', task) && _resData[appName];
          // check if records are fully processed
          _totalTask.forEach(function(_name) {
              if (_resData[_name] && !$isArray(_resData[_name])) {
                  delete _delRecordManager[appName][task][_name];
                  _inc++;
              } else {
                  setMessage(_resData[_name].reasons);
              }
          });

          /**
           * check is request type was database
           */
          if (_isDataBaseTask) {
              delete _delRecordManager[appName];
          }

          //update the storage
          setStorageItem($queryDB.$delRecordName, _delRecordManager, appName);
          /**
           * reset deletedRecords
           */
          if ($isEqual(_inc, _totalTask.length)) {
              if (_isDataBaseTask) {
                  $queryDB.closeDB(appName, true);
              } else {
                  $queryDB
                      .$getActiveDB(appName)
                      .$get('resolvers')
                      .deleteManager()
                      .reset();
              }
          }

          _delRecordManager = _resData = null;
      }

      /**
       * 
       * @param {*} _task 
       */
      this.done = function(_task) {
          return function(res) {
              /**
               * cleanup
               */
              if (res) {
                  cleanUp(_task, res);
              }


              if (!$isEqual(_task, 'database')) {
                  new startSyncState(appName, serverResource).process(true);
              } else {
                  syncHelper.finalizeProcess(appName);
              }
          }
      };

      this.fail = function(res) {
          setMessage('Failed to synchronize, unabled to resolve with the server, please try again');
          syncHelper.killState(appName);
      };


      this.process = function() {
          var self = this;
          /**
           * get the Application API
           */
          syncHelper
              .process
              .getApplicationApiKey(appName)
              .then(mainProcess, function() {
                  setMessage('Failed to retrieve Application Key');
                  self.fail();
              });

          /**
           * Main sync Process
           */

          function mainProcess() {
              var api = 'remtbl',
                  data = deleteRecords.table,
                  message = 'Droping ' + JSON.stringify(Object.keys(data)) + ' Tables from the server',
                  _task = "table";
              //check if database was remove from client
              if (deleteRecords.database[appName]) {
                  api = 'remdb';
                  data = deleteRecords.database;
                  message = "Droping " + appName + " Application from the server";
                  _task = "database";
              }


              /**
               * Process renamed Tables before deleting
               */
              var _renamedTables = Object.keys(deleteRecords.rename);
              if ($isEqual(_task, 'table') && _renamedTables.length) {
                  setMessage('Renaming Tables(' + JSON.stringify(_renamedTables) + ') on the server');
                  processRenamedTables()
                      .then(mainRequest, self.fail);
                  return;
              }


              function processRenamedTables() {
                  return request("rentbl", 'POST', 'renamed', deleteRecords.rename)
                      .then(function(res) {
                          cleanUp('rename', res);
                      });
              }

              function request(_api, type, ref, data) {
                  var _options = syncHelper.setRequestData(appName, _api, true, null, type);
                  _options.data[ref] = data;
                  return $queryDB.$http(_options);
              }

              function mainRequest() {
                  if (!Object.keys(data).length) {
                      self.done(_task)();
                      return;
                  }
                  //set message to our console
                  setMessage(message);
                  request(api, 'DELETE', 'remove', data)
                      .then(self.done(_task), self.fail);
              }

              mainRequest();
          }
      }
  }