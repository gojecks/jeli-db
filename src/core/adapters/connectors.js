function ConnectorAdapter(){
    var registeredConnectors = {};
    this.register = function(name, connector){
        if (registeredConnectors[name] || !isfunction(connector)) {
            return console.error('Unable to existing or invalid connector');
        }

        registeredConnectors[name] = connector;
    };

    this.use = function(name){
        var connector = registeredConnectors[name];
        if (!connector) throw new Error("Connector "+  name + " not found, please make sure it's registered")
        connector.$privateApi = privateApi;
        return connector;
    };
}