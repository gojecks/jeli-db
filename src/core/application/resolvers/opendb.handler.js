/**
 * 
 * @param {*} definition 
 * 
 * @return AstractContainer INSTANCE
 */
function AstractContainer(definition) {
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

AstractContainer.prototype.open = function() {
    this._open = true;
    this._closed = false;
    return this;
}

AstractContainer.prototype.close = function() {
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
AstractContainer.prototype.createInstance = function(name, definitions) {
    if (!this._container.hasOwnProperty(name)) {
        this._container[name] = new AstractContainer(definitions);
    }

    return this;
};

/**
 * 
 * @param {*} name 
 */
AstractContainer.prototype.get = function(name) {
    return this._container[name];
};

/**
 * 
 * @param {*} name 
 * @param {*} value 
 */
AstractContainer.prototype.set = function(name, value) {
    this._container[name] = value;
    return this;
};

/**
 * 
 * @param {*} name 
 */
AstractContainer.prototype.has = function(name) {
    return this._container.hasOwnProperty(name);
}

/**
 * 
 * @param {*} name 
 */
AstractContainer.prototype.destroy = function(name) {
    if (name) {
        this._container[name] = null;
        delete this._container[name];
    }

    return this;
};

AstractContainer.prototype.incrementInstance = function() {
    this.instance++;
    return this;
};

AstractContainer.prototype.decrementInstance = function() {
    this.instance--;
    return this;
};

AstractContainer.prototype.keys = function() {
    return Object.keys(this._container);
};