/**
 * @internal validators
 */
var _type_validators_ = Object({
    _char_: function(type) {
        return (isequal(type, 'string'));
    },
    _number_: function(type, data) {
        return (isnumber(data) || !isNaN(Number(data)));
    },
    _double_: function(type, data) {
        return isdouble(data);
    },
    _boolean_: function(type, data) {
        return (!isNaN(Number(data)));
    },
    _float_: function(type, data) {
        return (isfloat(data));
    },
    _date_: function(type, data) {
        return (new Date(data) instanceof Date);
    },
    _object_: (type, data) => isobject(data),
    _array_: (type, data) => isarray(data),
    _arrayobject_: (type, data) => (isarray(data) && (data[0] ? isobject(data[0]) : true)),
    _blob_: function(type, data) {
        return ( isobject(data) || isarray(data) || isstring(data));
    },
    _any_: function() {
        return true
    }
});

var defaultValidatorMapper = Object({
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
        _validator_: "_object_"
    },
    'ARRAY': {
        _validator_: "_array_"
    },
    'ARRAYOBJECT':{
        _validator_: "_arrayobject_"
    },
    'BLOB': {
        _validator_: "_blob_"
    },
    'ANY': {
        _validator_: "_any_"
    }
});

/**
 * Database TYPE VALIDATOR
 */
class DataTypeHandler {
    constructor(){
        this._dataTypes = {};
    }
   
    getAll() {
        return Object.keys(this._dataTypes).concat(Object.keys(defaultValidatorMapper));
    }

    add(type, definition) {
        this._dataTypes[type] = definition;
        return this;
    };

    addValidator(name, fn) {
        _type_validators_[name] = fn;
        return this;
    };

    getValidator(type) {
        var retType = defaultValidatorMapper[type] || this._dataTypes[type];
        return (retType ? _type_validators_[retType._validator_] : function() { return false; });
    }

    validate(data, requiredType) {
        var type = typeof data;
        var validate = this.getValidator(requiredType);
        return validate(type, data, requiredType);

    }
}
