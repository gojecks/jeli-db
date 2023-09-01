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