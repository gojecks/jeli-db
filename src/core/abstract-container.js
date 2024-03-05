/**
 * 
 * @param {*} definition 
 * 
 * @return AbstractContainer INSTANCE
 */
function AbstractContainer(definition) {
    this.instance = 0;
    this._open = false;
    this._closed = false;
    this._container = Object(definition || null);

    Object.defineProperties(this, {
        opened: {
            get: function() {
                return this._open;
            }
        },
        closed: {
            get: function() {
                return this._closed;
            }
        }
    });
}

AbstractContainer.prototype.open = function() {
    this._open = true;
    this._closed = false;
    return this;
}

AbstractContainer.prototype.close = function() {
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
AbstractContainer.prototype.createInstance = function(name, definitions) {
    if (!this._container.hasOwnProperty(name)) {
        this._container[name] = new AbstractContainer(definitions);
    }

    return this;
};

/**
 * 
 * @param {*} name 
 */
AbstractContainer.prototype.get = function(name) {
    return this._container[name];
};

/**
 * 
 * @param {*} name 
 * @param {*} value 
 */
AbstractContainer.prototype.set = function(name, value) {
    this._container[name] = value;
    return this;
};

/**
 * 
 * @param {*} name 
 */
AbstractContainer.prototype.has = function(name) {
    return this._container.hasOwnProperty(name);
}

/**
 * 
 * @param {*} name 
 */
AbstractContainer.prototype.destroy = function(name) {
    if (name) {
        this._container[name] = null;
        delete this._container[name];
    }

    return this;
};

AbstractContainer.prototype.incrementInstance = function() {
    this.instance++;
    return this;
};

AbstractContainer.prototype.decrementInstance = function() {
    this.instance--;
    return this;
};

AbstractContainer.prototype.keys = function() {
    return Object.keys(this._container);
};

AbstractContainer.prototype.rename = function(oldName, newName) {
    if (this.has(oldName)) {
        this._container[newName] = this._container[oldName];
        delete this._container[oldName];
    }
}