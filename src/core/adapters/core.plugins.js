/**
 * core custom pluginFn
 */
function PluginsInstance() {
    //used to hold customPlugins
    this._pluginsContainer = new Map();
    this.get = function(pluginId) {
        return this._pluginsContainer.get(pluginId);
    }
}

PluginsInstance.prototype.jQl = function(name, plugin) {
    if (name && isobject(plugin) && !this._pluginsContainer.has(name)) {
        this._pluginsContainer.set(name, plugin);
    } else {
        errorBuilder('Failed to register plugin, either it already exists or invalid definition');
    }
}

PluginsInstance.prototype.disablePlugins = function(list) {
    if (isarray(list)) {
        for (var i = 0; i < list.length; i++) {
            if (!this._pluginsContainer.has(list[i])) {
                this._pluginsContainer.get(list[i]).disabled = true;
            }
        }
    }
}

PluginsInstance.prototype.enablePlugins = function(list) {
    if (isarray(list)) {
        for (var i = 0; i < list.length; i++) {
            if (!this._pluginsContainer.has(list[i])) {
                this._pluginsContainer.get(list[i]).disabled = false;
            }
        }
    }
}