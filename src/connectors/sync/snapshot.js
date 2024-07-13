 /**
  * comparism functionality
  * @method snapShot
  * @param {*} server 
  * @param {*} client 
  */
 class SnapShot {
    constructor(server, client){
        this.counter = 0;
        this.hashChanges = (server._hash !== (client._hash || client._previousHash));
        this.isLocalLastModified = server.lastModified < client.lastModified;
        this.getSnap = function() {
            if (['primaryKey', 'foreignKey', 'index'].some(key => this.jsonDiff(server[key], client[key]))) {
                this.counter++;
            }
   
            return this.checker(
               ((this.isLocalLastModified ? client : server).columns[0] || {}), 
               ((this.isLocalLastModified ? server : client).columns[0] || {})
           );
        };
    }

    jsonDiff = function(a, b) {
        if (typeof a !== 'object' && Object.is(a, b)) return false;
        return JSON.stringify(a) != JSON.stringify(b);
    }

    checker(clientData, serverData, type) {
        var _changes = { update: 0, insert: 0, delete: 0, diff: 0, localChanges: this.isLocalLastModified };
        var clientKeys = Object.keys(clientData);

        if (this.isLocalLastModified) {
           var serverKeys = Object.keys(serverData);
            _changes.delete = serverKeys.filter(key => !clientKeys.includes(key)).length;
            _changes.insert = clientKeys.filter(key => !serverKeys.includes(key)).length;
            this.counter++;
        }
   
        for(var key of clientKeys){
            //set the record to update
            var diffData = serverData[key];
            //server data exist and local data exists
            if (diffData) {
                //changes have been made to either client or server
                //cache the changes
                if (this.jsonDiff(diffData, clientData[key])) {
                    //update with client
                    Object.assign(diffData, clientData[key]);
                    _changes.update++;
                    this.counter++;
                }
            }
        }
   
        return _changes;
    }
 }