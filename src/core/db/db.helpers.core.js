//DB helper
function jCMDHelpers() {
    var list = [];
    //env
    this.add = function(help) {
        list.push(help);
    };

    this.get = function() {
        return list;
    };

    this.overwrite = function(helps) {
        if ($isArray(helps) && helps.length) {
            list = helps;
        }
    };
}

ApplicationInstance.prototype.jDBHelpers = new jCMDHelpers();