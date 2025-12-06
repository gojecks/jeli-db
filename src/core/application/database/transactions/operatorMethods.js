class OperatorMethod {
    static _call(type, queryValue, recordValue){
        type = type.toLowerCase();
        if (!!this[type])
           return this[type](queryValue, recordValue);

        return false
    }

    static _toNumber(value){
        if(Array.isArray(value)) return value.length;
        else if('string' == typeof value) return /^[0-9.]+$/.test(value) ? Number(value) : value.length;
        return value;
    }

    static lte(queryValue, recordValue) {
        return this._toNumber(queryValue) <= recordValue;
    }
    static gte(queryValue, recordValue) {
        return this._toNumber(queryValue) >= recordValue;
    }

    static lt(queryValue, recordValue) {
        return this._toNumber(queryValue) < recordValue;
    }
    /**
     * Min-Max
     * @param {*} queryValue 
     * @param {*} recordValue 
     * @returns 
     */
    static lgte(queryValue, recordValue) {
        if (!isarray(queryValue)) return false;
        return (queryValue[0] >= recordValue || ((queryValue[1] || 0) <= recordValue));
    }
    
    static gt(queryValue, recordValue) {
        return this._toNumber(queryValue) > recordValue;
    }
    static inclause =  inarray;
    static inarray = inarray;
    static inarrayr(queryValue, recordValue) {
        return inarray(recordValue, queryValue);
    }

    static lk(queryValue, recordValue) {
        return (String(queryValue || "").toLowerCase()).search((recordValue || '').toLowerCase()) > -1;
    }
    
    static notinclause(queryValue, recordValue) {
        return !inarray(queryValue, recordValue);
    }
    static notinarray(){
        return !inarray(queryValue, recordValue);
    }
    static notinarrayr(queryValue, recordValue) {
        return !inarray(recordValue, queryValue);
    }
    static is(queryValue, recordValue) {
        return isequal(recordValue, queryValue);
    }
    static not(queryValue, recordValue) {
        return !isequal(recordValue, queryValue);
    }
    static isdefined(queryValue, recordValue) {
        return isequal(recordValue, !isempty(queryValue));
    }

    static isnot(queryValue, recordValue) {
        return recordValue != queryValue;
    }

    static eq(queryValue, recordValue) {
        return recordValue == queryValue;
    }

    static truthy(queryValue, recordValue) {
        return (!!queryValue == recordValue);
    }

    static struthy(queryValue, recordValue) {
        return !queryValue;
    }
    
    static datediff(queryValue, recordValue) {
        if (!isarray(recordValue) || !queryValue) return false;
        var dateDiff = (+new Date  - queryValue);
        return ({
            m: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 30 * 1000)) <= diff,
            mn: (diff) => Math.round(dateDiff / (60 * 60 * 1000)) <= diff,
            d: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 1000)) <= diff,
            y: (diff) => Math.round(dateDiff / (60 * 60 * 24 * 30.42 * 12 * 1000)) <= diff
        })[recordValue[1]](recordValue[0]);
    }

    static groupexpressions(queryValue, groupsExp){
        if (!isobject(groupsExp) || !Array.isArray(groupsExp.expressions)) return false;
        var matchAll = ((groupsExp.operator || 'AND').toUpperCase()).includes('AND');
        var matched = false;
        
        for(var exp of groupsExp.expressions) {
            if(!this._call(exp.type, queryValue, exp.value)) {
                if (matchAll) return false;
            } else {
                matched = true;
                if (!matchAll) return true;
            }
        }

        return matched;
    }
}