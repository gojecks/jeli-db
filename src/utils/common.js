/*** Common Method ***/
/*** Methods are Private **/
//@Function trim
var trim = ''.trim ? function (s) { return s.trim(); } : function (s) {
    return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
};


/**
 * 
 * @param {*} obj 
 */
function isobject(obj) {
    return typeof obj === 'object' && obj instanceof Object && Object.prototype.toString.call(obj) === '[object Object]';
};

/**
 * 
 * @param {*} str 
 */
function isstring(str) {
    return (typeof str === 'string' && !('{['.includes(str.charAt(0))));
}

/**
 * 
 * @param {*} str 
 */
function isjsonstring(str) {
    return (str && typeof str === 'string' && ("{[".includes(str.charAt(0)) && "}]".includes(str.charAt(str.length - 1))));
}

function noop() {
    return null;
}

/**
 * 
 * @param {*} n 
 */
function isnumber(n) {
    return Number(n) === n && n % 1 === 0;
}

/**
 * 
 * @param {*} n 
 */
function isfloat(n) {
    return Number(n) === n && n % 1 !== 0;
}

/**
 * 
 * @param {*} n 
 */
function isdouble(n) {
    return parseFloat(n) > 0;
}

/**
 * 
 * @param {*} obj 
 */
function isarray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

function isemptyobject(obj) {
    return obj && !objectValues(obj).length;
}
/**
 * 
 * @param {*} fn 
 */
function isfunction(fn) {
    return typeof fn === 'function';
}

/**
 * 
 * @param {*} obj 
 */
function objectValues(value) {
    return Object.keys(value);
}
/**
 * 
 * @param {*} bool 
 */
function isboolean(bool) {
    return Object.prototype.toString.call(bool) === '[object Boolean]';
}

/**
 * 
 * @param {*} val 
 */
function isundefined(val) {
    return typeof val === 'undefined';
}

/**
 * 
 * @param {*} val 
 */
function isdefined(val) {
    return typeof val !== 'undefined';
}

//check for null attribute
/**
 * 
 * @param {*} val 
 */
function isnull(val) {
    return null === val;
}

//check for empty value
/**
 * 
 * @param {*} val 
 */
function isempty(val) {
    if (!val) return true;
    if (isarray(val)) return !val.length;
    return val === "";
}

/**
 * 
 * @param {*} a 
 * @param {*} b 
 */
function isequal(a, b) {
    return a === b;
}

/**
 * 
 * @param {*} a 
 * @param {*} b 
 */
function inarray(a, b) {
    return (isstring(b) || isarray(b)) && b.indexOf(a) > -1;
}

/**
 * 
 * @param {*} str 
 */
function jSonParser(str) {
    if (isjsonstring(str)) {
        try {
            str = JSON.parse(str);
        } catch (e) { }
    }
    return str;
}

//@Function extend


/**
 * 
 * @param {*} item 
 * @param {*} deep 
 */
function copy(item, deep) {
    var type = {};
    if (Object.prototype.toString.call(item) === '[object Array]') {
        type = [];
    }

    if (item && item.nodeType) return item.cloneNode(true); // Node
    if (typeof item === 'object' && !deep) return item;
    if (item instanceof Date) return new Date(item.getTime());
    if (item instanceof RegExp) return new RegExp(item);
    if (typeof item !== "object") return item;

    if (deep) {
        var ret;
        try {
            ret = JSON.parse(JSON.stringify(item))
        } catch (e) {
            ret = Object.assign({}, item);
        }

        return ret;
    }

    return Object.assign(type, item);
}

/**
 * 
 * @param {*} error 
 */
function errorBuilder(error) {
    function DBTxException() {
        this.name = "jEliException";
        this.message = error;
    }

    DBTxException.prototype.toString = function () {
        return this.name + ': "' + this.message + '"';
    };

    if (isstring(error)) {
        throw new DBTxException(error);
    } else {
        console.error(error);
    }
}

/**
 * 
 * @param {*} str 
 */
function removewhitespace(str) {
    str = (str || '')
    if (/["']/g.test(str)) {
        return str
    }
    return str.replace(/\s+/g, '');
}

/**
 * 
 * @param {*} str 
 */
function removeSingleQuote(str) {
    if ('true|false|1|0'.indexOf(str) > -1 || isundefined(str)) return str;

    return String(str).replace(/[']/g, "");
}

function jsonDiff(a, b) {
    if (Object.is(a, b)) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

function stringEqualToObject(str) {
    var splitComma = removeSingleQuote(str).split(',').map(v => v.split('='));
    return splitComma.reduce((accum, value) => {
        //set the new Object Data
        accum[value[0].trim()] = jSonParser(value[1].trim());
        return accum
    }, {});
}

/**
 * @param {*} ttl 
 * @returns number
 */
function getDateTimeFromTTL(ttl){
    var format = ttl.split(/\d/).pop();
    var now = new Date();
    // generate time from now based on format
   return ({
        d: c => now.setSeconds(60 * 60 * 24) * c,
        w: c => now.setSeconds(60 * 60 * 24 * 7) * c,
        m: c => now.setSeconds(60 * 60 * 24 * 30) * c
    })[format]( parseInt(ttl) || 1);
}