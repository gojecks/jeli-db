/**
 * @Function serialize object to string
 * @Argument (OBJECT)
 * @param {*} obj
 * @return Query Param eg(foo=bar&bar=foo)
 */
function serialize(obj) {
    if (!obj) return;
    var param = [];
    /**
     * 
     * @param {*} prefix 
     * @param {*} dn 
     */
    function buildParams(prefix, dn) {
        if (isarray(dn)) {
            dn.forEach(function(n) {
                if ((/\[\]$/).test(prefix)) {
                    add(prefix, n);
                } else {
                    buildParams(prefix + "[" + (isobject(n) ? prefix : "") + "]", n)
                }
            });
        } else if (isobject(dn)) {
            for (var name in dn) {
                buildParams(prefix + "[" + name + "]", dn[name]);
            }
        } else {
            add(prefix, dn);
        }
    }

    /**
     * 
     * @param {*} key 
     * @param {*} value 
     */
    function add(key, value) {
        value = isfunction(value) ? value() : (isempty(value) ? "" : value);
        param[param.length] = encodeURIComponent(key) + '=' + encodeURIComponent(value);
    };

    if (isarray(obj)) {
        obj.forEach(function(n, i) {
            add(i, n)
        });
    } else {
        for (var name in obj) {
            buildParams(name, obj[name]);
        }
    }

    return param.join("&").replace(/%20/g, '+');
}

/**
 * Function unSerialize
 * @param {*} par 
 */
function unSerialize(par) {
    var ret = {};
    if (!isundefined(par) && isstring(par)) {
        par.split("&").forEach(function(val, key) {
            if (val) {
                var splitPairs = val.split('=');
                ret[splitPairs[0]] = jSonParser(splitPairs[1]);
            }
        })
    }

    return ret;
}

/**
 * 
 * @param {*} e 
 */
function makeUID(e) {
    var h = '';
    var f = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var g = 0; g < e; g++) {
        h += f.charAt(Math.floor(Math.random() * f.length))
    }
    return h
}