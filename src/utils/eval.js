/**
 * 
 * @param {*} expression 
 * @param {*} context 
 */
function maskedEval(expression, context) {
    if ((/([|<>=()\-!*+&\/\/:])/gi).test(expression)) {
        // execute script in private context
        return (new Function("with(this) { try{ return " + expression + " }catch(e){ return undefined; } }")).call(context || {})
    }
}

function modelGetter(field, cdata) {
    if (typeof field === 'object' || isboolean(field) || isnumber(field)) return field;
    return field.replace(/(\[)/g, '.').replace(/(\])/g, '').split('.').reduce(function(accum, key) {
        return (accum && accum.hasOwnProperty(key)) ? accum[key] : null;
    }, cdata || {});
}
