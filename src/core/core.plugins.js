//prototype for jEli Plugin
var customPlugins = new Map(); //used to hold customPlugins
/**
 * core custom pluginFn
 */
jEliDB.JDB_PLUGINS = Object.create({
    jQl: function(name, plugin) {
        if (name && $isObject(plugin) && !customPlugins.has(name)) {
            customPlugins.set(name, plugin);
        } else {
            errorBuilder('Failed to register plugin, either it already exists or invalid definition');
        }
    },
    disablePlugins: function(list) {
        if ($isArray(list)) {
            list.forEach(disable);
            return;
        }
        disable(list);

        function disable(_plugin) {
            if (customPlugins.has(_plugin)) {
                customPlugins.get(_plugin).disabled = true;
            }
        }
    },
    enablePlugins: function(list) {
        if ($isArray(list)) {
            list.forEach(enable);
            return;
        }

        enable(list);

        function enable(_plugin) {
            if (customPlugins.has(_plugin)) {
                customPlugins.get(_plugin).disabled = false;
            }
        }
    }
});