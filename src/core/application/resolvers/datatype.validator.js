/**
 * @internal validators
 */
var _type_validators_ = Object({
    char: (type) => (isequal(type, 'string')),
    number: (type, data) => (isnumber(data) || !isNaN(Number(data))),
    double: (type, data) => isdouble(data),
    boolean: (type, data) => (!isNaN(Number(data))),
    float: (type, data) => (isfloat(data)),
    date: (type, data) => (new Date(data) instanceof Date),
    object: (type, data) => isobject(data),
    array: (type, data) => isarray(data),
    arrayobject: (type, data) => (isarray(data) && (data[0] ? isobject(data[0]) : true)),
    blob: (type, data) => (isobject(data) || isarray(data) || isstring(data)),
    any: () => true
});

var defaultValidatorMapper = Object({
    'VARCHAR': {
        validator: "char"
    },
    'TEXT': {
        validator: "char"
    },
    'STRING': {
        validator: "char"
    },
    'NUMBER': {
        validator: "number"
    },
    'INTEGER': {
        validator: "number"
    },
    'INT': {
        validator: "number"
    },
    'SMALLINT': {
        validator: "number"
    },
    'BIGINT': {
        validator: "number"
    },
    'DOUBLE': {
        validator: "double"
    },
    'DECIMAL': {
        validator: "double"
    },
    'LONG': {
        validator: "double"
    },
    'BOOLEAN': {
        validator: "boolean"
    },
    'FLOAT': {
        validator: "float"
    },
    'DATETIME': {
        validator: "date"
    },
    'TIMESTAMP': {
        validator: "date"
    },
    'DATE': {
        validator: "date"
    },
    'OBJECT': {
        validator: "object"
    },
    'ARRAY': {
        validator: "array"
    },
    'ARRAYOBJECT':{
        validator: "arrayobject"
    },
    'BLOB': {
        validator: "blob"
    },
    'ANY': {
        validator: "any"
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
        return (retType ? _type_validators_[retType.validator] : function() { return false; });
    }

    validate(data, requiredType) {
        var type = typeof data;
        var validate = this.getValidator(requiredType);
        return validate(type, data, requiredType);
    }
}
