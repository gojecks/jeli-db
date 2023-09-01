  //generate GUID
  //xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  function GUID() {
      var rand = function() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
      return [2, 1, 1, 3].map(function(loop) {
          var h = "";
          for (var i = 0; i < loop; i++) {
              h += rand();
          }
          return h;
      }).join('-');
  }

  /**
   * 
   * @param {*} weight 
   * @returns 
   */
  function randomStringGenerator(weight) {
      var s = '';
      var from = 'abcdefghijklmnnopqrstuvwxyzABCDEFGHIJKLMOPQRSTUVWXYZ00123456789';
      for (var i = 0; i < weight; i++) {
          s += from.charAt(Math.floor(Math.random() * from.length));
      }

      return s;
  }

  function jEliDeepCopy(data) {
      return JSON.parse(JSON.stringify(data));
  }