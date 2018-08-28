/**
 * JELIDB TYPE VALIDATOR
 */
function DataTypeHandler() {
    var _dataTypes = {
            'VARCHAR': {
                _validator_: "_char_"
            },
            'TEXT': {
                _validator_: "_char_"
            },
            'STRING': {
                _validator_: "_char_"
            },
            'NUMBER': {
                _validator_: "_number_"
            },
            'INTEGER': {
                _validator_: "_number_"
            },
            'INT': {
                _validator_: "_number_"
            },
            'SMALLINT': {
                _validator_: "_number_"
            },
            'BIGINT': {
                _validator_: "_number_"
            },
            'DOUBLE': {
                _validator_: "_double_"
            },
            'DECIMAL': {
                _validator_: "_double_"
            },
            'LONG': {
                _validator_: "_double_"
            },
            'BOOLEAN': {
                _validator_: "_boolean_"
            },
            'FLOAT': {
                _validator_: "_float_"
            },
            'DATETIME': {
                _validator_: "_date_"
            },
            'TIMESTAMP': {
                _validator_: "_date_"
            },
            'DATE': {
                _validator_: "_date_"
            },
            'OBJECT': {
                _validator_: "_blob_"
            },
            'ARRAY': {
                _validator_: "_blob_"
            },
            'BLOB': {
                _validator_: "_blob_"
            },
            'ANY': {
                _validator_: "_any_"
            }
        },
        _type_validators_ = {
            _char_: function(type) {
                return ($isEqual(type, 'string'));
            },
            _number_: function(type, data, requiredType) {
                return ($isNumber(data) || !isNaN(Number(data)));
            },
            _double_: function(type, data, requiredType) {
                return $isDouble(data);
            },
            _boolean_: function(type, data, requiredType) {
                return (!isNaN(Number(data)));
            },
            _float_: function(type, data, requiredType) {
                return ($isFloat(data));
            },
            _date_: function(type, data, requiredType) {
                return (new Date(data) instanceof Date);
            },
            _blob_: function(type, data, requiredType) {
                return ($isObject(data) || $isArray(data) || $isString(data));
            },
            _any_: function(type, data, requiredType) {
                return type
            }
        };

    this.getAll = function() {
        return Object.keys(_dataTypes);
    };

    this.add = function(type, definition) {
        _dataTypes[type] = definition;
        return this;
    };

    this.getType = function(type) {
        return _dataTypes[type];
    }

    this.__validate__ = function(type) {
        return _type_validators_[type] || function() { return false; };
    };

    this.addValidator = function(name, fn) {
        _type_validators_[name] = fn;
        return this;
    };
}

DataTypeHandler.prototype.validate = function(data, requiredType) {
    var type = typeof data,
        retType = this.getType(requiredType);

    if (retType) {
        return this.__validate__(retType._validator_)(type, data, requiredType);
    }

    return false;
};