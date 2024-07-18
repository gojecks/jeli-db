/**
 * core custom pluginFn
 */
class PluginsInstance {
    //used to hold customPlugins
    constructor(){
        this._pluginsContainer = new Map();
    }
    
    get(pluginId) {
        return this._pluginsContainer.get(pluginId);
    }

    jQl(name, plugin) {
        if (name && isobject(plugin) && !this._pluginsContainer.has(name)) {
            this._pluginsContainer.set(name, plugin);
        } else {
            errorBuilder('Failed to register plugin, either it already exists or invalid definition');
        }
    }
    
    disablePlugins(list) {
        if (isarray(list)) {
            for (var i = 0; i < list.length; i++) {
                if (!this._pluginsContainer.has(list[i])) {
                    this._pluginsContainer.get(list[i]).disabled = true;
                }
            }
        }
    }
    
    enablePlugins(list) {
        if (isarray(list)) {
            for (var i = 0; i < list.length; i++) {
                if (!this._pluginsContainer.has(list[i])) {
                    this._pluginsContainer.get(list[i]).disabled = false;
                }
            }
        }
    }
}