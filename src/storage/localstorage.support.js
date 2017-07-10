  function jDBStorage(storageName){
    var _storage = window[storageName] || {};
    
    this.setItem = function(name,value){
        value = JSON.stringify(value);
        var filesizeCheck = Math.floor( (((value.length) * 2) / 1024).toFixed(2));
        if(filesizeCheck >= (1024 * 5)){
          $queryDB.getNetworkResolver('logService')("_STORAGE_ERROR:File-Size is too large :"+(filesizeCheck / 1024)+" MB");
          return;
        }

      _storage[name] = value;
    };

    this.getItem = function(name){
      return (_storage[name] && JSON.parse(_storage[name])) || undefined;
    };

    this.removeItem = function(name){
      delete _storage[name];
    };

    this.clear = function(){
      _storage.clear && _storage.clear();
    };

    this.usage = function(name){
      return (_storage[name] || '').length;
    };
  }
