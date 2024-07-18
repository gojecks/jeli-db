class ConnectorAdapter{
    constructor(){
        this.registeredConnectors = {};
    }
    
    register(name, connector){
        if (this.registeredConnectors[name] || !isfunction(connector)) {
            return console.error('Unable to existing or invalid connector');
        }

        this.registeredConnectors[name] = connector;
    }

    use(name){
        var connector = this.registeredConnectors[name];
        if (!connector) throw new Error("Connector "+  name + " not found, please make sure it's registered")
        connector.$privateApi = privateApi;
        return connector;
    }
}