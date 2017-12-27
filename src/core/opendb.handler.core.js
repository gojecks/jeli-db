/**
 * 
 * @param {*} definition 
 * 
 * @return openedDBHandler INSTANCE
 */
function openedDBHandler(definition) {
    var _holder = Object.create(definition || {});

    this.$new = function(name, value) {
        if (!_holder[name]) {
            _holder[name] = value;
        }

        return this;
    };

    this.$get = function(name) {
        return _holder[name];
    };

    this.$set = function(name, value) {
        _holder[name] = value;
        return this;
    };

    this.$hasOwnProperty = function(name) {
        return _holder.hasOwnProperty(name);
    };

    this.$destroy = function(name) {
        _holder[name] = null;
        return this;
    };
}