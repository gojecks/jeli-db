/**
 * 
 * @param {*} definition 
 * 
 * @return AbstractContainer INSTANCE
 */
class AbstractContainer extends Map{
    constructor(){
        super();
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
        this._open = true;
        this._closed = false;
        return this;
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