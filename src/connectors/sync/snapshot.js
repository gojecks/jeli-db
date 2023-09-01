 /**
  * comparism functionality
  * @method snapShot
  * @param {*} server 
  * @param {*} client 
  */
 function SnapShot(server, client) {
     this.counter = 0;
     this.hashChanges = (server._hash !== (client._hash || client._previousHash));
     this.isLocalLastModified = server.lastModified < client.lastModified;
     this.getSnap = function() {
         if (['primaryKey', 'foreignKey', 'index'].some(key => { return !this.jsonDiff(server[key], client[key]) })) {
             this.counter++;
         }

         return this.checker(client.columns[0] || {}, server.columns[0] || {})
     };

     this.jsonDiff = function(a, b) {
        if (Object.is(a, b)) return true;
        return JSON.stringify(a) === JSON.stringify(b);
      }
 }

 /**
  * 
  * @param {*} localData 
  * @param {*} server 
  * @param {*} type 
  * @returns 
  */
 SnapShot.prototype.checker = function(localData, server, type) {
     var _changes = { update: 0, insert: 0, delete: 0, diff: 0, localChanges: this.isLocalLastModified };
     var diffRecursive = this.isLocalLastModified ? localData : server;
     var diffLoop = (this.isLocalLastModified ? server : localData);

     if (this.isLocalLastModified) {
         var clientKeys = Object.keys(localData);
         var serverKeys = Object.keys(server);
         _changes.delete = serverKeys.filter(function(key) { return !clientKeys.includes(key); }).length;
         _changes.insert = clientKeys.filter(function(key) { return !serverKeys.includes(key); }).length;
         this.counter++;
     }


     for (var prop in diffRecursive) {
         //set the record to update
         var diffData = diffLoop[prop];
         //server data exist and local data exists
         if (diffData) {
             //changes have been made to either client or server
             //cache the changes
             if (!this.jsonDiff(diffData, diffRecursive[prop])) {
                 //update with client
                 Object.assign(diffData, diffRecursive[prop]);
                 _changes.update++;
                 this.counter++;
             }
         }
     }

     return _changes;
 }