//prototype for jEli Plugin
var customPlugins = new watchBinding(); //used to hold customPlugins
/**
 * core custom pluginFn
 */
var plugins = Object.create({
    jQl: function(name, plugin) {
        if (name && $isObject(plugin) && !customPlugins.hasProp(name)) {
            customPlugins.$new(name, plugin);
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
            if (customPlugins.hasProp(_plugin)) {
                customPlugins.$get(_plugin).disabled = true;
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
            if (customPlugins.hasProp(_plugin)) {
                customPlugins.$get(_plugin).disabled = false;
            }
        }
    }
});

global.JDB_PLUGINS = plugins;