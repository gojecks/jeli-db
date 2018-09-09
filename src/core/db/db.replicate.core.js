/**
 * Replicate function
 * Create exact copy of an existing application
 * @param {*} definition <object>
 *  - name 
 *  - create
 *  - type
 */
DBEvent.prototype.replicate = function(definition) {
    var $defer = new $p();
    definition.current = this.name;
    if (!definition.name) {
        definition.name = this.name + "_copy";
    }

    this.api('/database/replicate', definition)
        .then(function(res) {
            $defer.resolve(dbSuccessPromiseObject('replicate', "Application successfully replicated"))
        }, $defer.reject);

    return $defer;
};