/**
 * Replicate function
 * Create exact copy of an existing application
 * @param {*} definition <object>
 *  - name 
 *  - create
 *  - type
 */
function ApplicationInstanceReplicate(definition) {
    definition.current = this.name;
    if (!definition.name) {
        definition.name = this.name + "_copy";
    }
};