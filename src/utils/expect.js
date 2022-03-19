/**
 * 
 * @param {*} objToInspect 
 */
function expect(objToInspect) {
    var isObject = objToInspect && (({}).toString).call(objToInspect) === "[object Object]";
    /**
     * 
     * @param {*} ins 
     */
    function contains(ins) {
        //Perform Object Check
        if (isObject) {
            return objToInspect.hasOwnProperty(ins) || (ins in objToInspect);
        } else {
            return objToInspect.indexOf(ins) > -1;
        }
    }
    /**
     * 
     * @param {*} str 
     * @param {*} iteratorFn 
     */
    function search(str, iteratorFn) {
        if (!objToInspect) {
            return false;
        }

        var found = false,
            len = 0,
            trigger = function(prop) {
                if (iteratorFn && typeof iteratorFn === 'function') {
                    if (iteratorFn(objToInspect[prop], prop, len)) {
                        found = objToInspect[prop];
                    }
                } else {
                    if (jsonDiff(objToInspect[prop], str)) {
                        found = objToInspect[len];
                    }
                }
                len++;
            };

        if (isObject) {
            var ObjKeys = Object.keys(objToInspect);
            while (ObjKeys.length > len) {
                trigger(ObjKeys[len]);
            }
            ObjKeys = null;
        } else {
            while (objToInspect.length > len) {
                trigger(len);
            };
        }

        //return
        return found;
    }

    function each(iterator) {
        this.search(null, iterator);
    }

    return {
        search: search,
        contains: contains,
        each: each
    };
}