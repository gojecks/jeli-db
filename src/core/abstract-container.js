/**
 * 
 * @param {*} definition 
 * 
 * @return AbstractContainer INSTANCE
 */
class AbstractContainer extends Map{
    constructor(name){
        super();
        this.name = name;
        this.instance = 0;
        this._open = false;
        this._closed = false;
    }

    get opened(){
        return this._open;
    }

    get closed(){
        return this._closed;
    }

    open() {
        if (this.opened) return true;
        if (this.closed) return !this.incrementInstance();

        this._open = true;
        this._closed = false;
        // set all required handlers
        this.set(constants.DATATYPES, new DataTypeHandler())
        .set(constants.RESOLVERS, new openedDBResolvers())
        .set(constants.RESOURCEMANAGER, new ResourceManager(this.name))
        .set(constants.RECORDRESOLVERS, new CoreDataResolver(this.name));
        return false;
    }
    
    close() {
        this._closed = true;
        this._open = false;
        return this;
    }
    
    incrementInstance() {
        this.instance++;
        return this;
    };
    
    decrementInstance() {
        this.instance--;
        return this;
    };
}