/**
 * 
 * @param {*} definition 
 * 
 * @return openedDBHandler INSTANCE
 */
function openedDBHandler(definition) {
    var _holder = Object.create(definition || {});

    /**
     * 
     * @param {*} name 
     * @param {*} value 
     */
    this.$new = function(name, value) {
        if (!_holder[name]) {
            _holder[name] = value;
        }

        return this;
    };

    /**
     * 
     * @param {*} name 
     */
    this.$get = function(name) {
        return _holder[name];
    };

    /**
     * 
     * @param {*} name 
     * @param {*} value 
     */
    this.$set = function(name, value) {
        _holder[name] = value;
        return this;
    };

    /**
     * 
     * @param {*} name 
     */
    this.$hasOwnProperty = function(name) {
        return _holder.hasOwnProperty(name);
    };
    /**
     * 
     * @param {*} name 
     */
    this.$destroy = function(name) {
        _holder[name] = null;
        delete _holder[name];
        return this;
    };

    this.$incrementInstance = function() {
        _holder.instance++;
        return this;
    };

    this.$decrementInstance = function() {
        _holder.instance--;
        return this;
    };
}