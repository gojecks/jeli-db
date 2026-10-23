 /**
  * Read-only schema comparison between the server and local copy of a table
  * @param {*} server
  * @param {*} client
  */
 class SnapShot {
    constructor(server, client) {
        this.hashChanges = (server._hash !== (client._hash || client._previousHash));
        this.isLocalLastModified = server.lastModified < client.lastModified;
        this.changes = SnapShot.diff(server, client);
        this.counter = this.changes.total;
    }

    // key-order independent; null, undefined and {} are equal
    static normalize(value) {
        if (value === undefined || value === null) return null;
        if (Array.isArray(value)) return value.map(SnapShot.normalize);
        if (typeof value == 'object') {
            const keys = Object.keys(value).sort();
            if (!keys.length) return null;
            return keys.reduce((accum, key) => (accum[key] = SnapShot.normalize(value[key]), accum), {});
        }

        return value;
    }

    static jsonDiff(a, b) {
        return JSON.stringify(SnapShot.normalize(a)) !== JSON.stringify(SnapShot.normalize(b));
    }

    static diff(server, client) {
        const serverColumns = (server.columns && server.columns[0]) || {};
        const clientColumns = (client.columns && client.columns[0]) || {};
        const serverKeys = Object.keys(serverColumns);
        const clientKeys = Object.keys(clientColumns);
        const changes = {
            serverOnly: serverKeys.filter(key => !clientKeys.includes(key)),
            localOnly: clientKeys.filter(key => !serverKeys.includes(key)),
            changed: clientKeys.filter(key => serverKeys.includes(key) && SnapShot.jsonDiff(serverColumns[key], clientColumns[key])),
            config: ['primaryKey', 'foreignKey', 'index'].filter(key => SnapShot.jsonDiff(server[key], client[key]))
        };
        changes.total = changes.serverOnly.length + changes.localOnly.length + changes.changed.length + changes.config.length;
        return changes;
    }

    getSnap() {
        return Object.assign({ localChanges: this.isLocalLastModified, dataChanged: this.hashChanges }, this.changes);
    }
 }
