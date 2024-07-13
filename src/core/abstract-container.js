/**
 * 
 * @param {*} definition 
 * 
 * @return AbstractContainer INSTANCE
 */
class AbstractContainer{
    constructor(definition){
        this.instance = 0;
        this._open = false;
        this._closed = false;
        this._container = Object(definition || null);
    }

    get opened(){
        return this._open;
    }

    get closed(){
        return this._closed;
    }

    open() {
        this._open = true;
        this._closed = false;
        return this;
    }
    
    close() {
        this._closed = true;
        this._open = false;
        return this;
    }
    
    /**
     * 
     * @param {*} name 
     * @param {*} definitions 
     * @returns 
     */
    createInstance(name, definitions) {
        if (!this._container.hasOwnProperty(name)) {
            this._container[name] = new AbstractContainer(definitions);
        }
    
        return this;
    };
    
    /**
     * 
     * @param {*} name 
     */
    get(name) {
        return this._container[name];
    };
    
    /**
     * 
     * @param {*} name 
     * @param {*} value 
     */
    set(name, value) {
        this._container[name] = value;
        return this;
    };
    
    /**
     * 
     * @param {*} name 
     */
    has(name) {
        return this._container.hasOwnProperty(name);
    }
    
    /**
     * 
     * @param {*} name 
     */
    destroy(name) {
        if (name) {
            this._container[name] = null;
            delete this._container[name];
        }
    
        return this;
    };
    
    incrementInstance() {
        this.instance++;
        return this;
    };
    
    decrementInstance() {
        this.instance--;
        return this;
    };
    
    keys() {
        return Object.keys(this._container);
    };
    
    rename(oldName, newName) {
        if (this.has(oldName)) {
            this._container[newName] = this._container[oldName];
            delete this._container[oldName];
        }
    }
}