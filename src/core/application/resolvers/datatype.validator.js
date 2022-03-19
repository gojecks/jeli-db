/**
 * @internal validators
 */
var _type_validators_ = Object({
    _char_: function(type) {
        return ($isEqual(type, 'string'));
    },
    _number_: function(type, data) {
        return ($isNumber(data) || !isNaN(Number(data)));
    },
    _double_: function(type, data) {
        return $isDouble(data);
    },
    _boolean_: function(type, data) {
        return (!isNaN(Number(data)));
    },
    _float_: function(type, data) {
        return ($isFloat(data));
    },
    _date_: function(type, data) {
        return (new Date(data) instanceof Date);
    },
    _blob_: function(type, data) {
        return ($isObject(data) || $isArray(data) || $isString(data));
    },
    _any_: function() {
        return true
    }
});

/**
 * Database TYPE VALIDATOR
 */
function DataTypeHandler() {
    this._dataTypes = Object({
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
    });

    this.getAll = function() {
        return Object.keys(this._dataTypes);
    };

    this.add = function(type, definition) {
        this._dataTypes[type] = definition;
        return this;
    };

    this.addValidator = function(name, fn) {
        _type_validators_[name] = fn;
        return this;
    };
}

DataTypeHandler.prototype.validate = function(data, requiredType) {
    var type = typeof data;
    var retType = this._dataTypes[requiredType];
    if (retType) {
        return (_type_validators_[retType._validator_] || function() { return false; })(type, data, requiredType);
    }

    return false;
};