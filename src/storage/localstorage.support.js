  /**
   * 
   * @param {*} storageName 
   * @param {*} dbName 
   */
  function jDBStorage(storageName, dbName) {
      var _storage = window[storageName] || {},
          _publicApi_ = {};

      _publicApi_.setItem = function(name, value) {
          value = JSON.stringify(value);
          var filesizeCheck = Math.floor((((value.length) * 2) / 1024).toFixed(2));
          if (filesizeCheck >= (1024 * 5)) {
              privateApi.getNetworkResolver('logService')("_STORAGE_ERROR:File-Size is too large :" + (filesizeCheck / 1024) + " MB");
              return;
          }

          _storage[name] = value;
      };

      _publicApi_.getItem = function(name) {
          return (_storage[name] && JSON.parse(_storage[name])) || undefined;
      };

      _publicApi_.removeItem = function(name) {
          delete _storage[name];
      };

      _publicApi_.clear = function() {
          _storage.clear && _storage.clear();
      };

      _publicApi_.usage = function(name) {
          return (_storage[name] || '').length;
      };

      _publicApi_.rename = function(oldName, newName, cb) {
          var oldData = this.getItem(oldName);
          expect(oldData.tables).each(function(tbl) {
              tbl.DB_NAME = newName;
              tbl.lastModified = +new Date
          });
          this.setItem(newName, oldData);
          this.setItem(privateApi.getResourceName(newName), this.getItem(privateApi.getResourceName(oldName)));
          privateApi.$getActiveDB(oldName).$get('recordResolvers').rename(newName);
          this.removeItem(oldName);
          (cb || noop)();
      };

      return _publicApi_;
  }