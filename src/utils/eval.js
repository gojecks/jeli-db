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
    if (!field || typeof field === 'object' || isboolean(field) || isnumber(field)) return field;
    return field.replace(/(\[)/g, '.').replace(/(\])/g, '').split('.').reduce(function(accum, key) {
        return (accum && accum.hasOwnProperty(key)) ? accum[key] : null;
    }, cdata || {});
}

/**
 * @param {*} field 
 * @param {*} record 
 * @param {*} value 
 */
function modelSetter(field, record, value){
    if(field && record) {
        field = field.split('.');
        var prop = field.pop();
        var object = field.reduce((accum, key) => ((accum[key] = accum[key] || {}), accum[key]), record);
        object[prop] = value;
    }
}
