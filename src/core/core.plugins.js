//prototype for jEli Plugin
var customPlugins = new watchBinding(); //used to hold customPlugins
/**
 * core custom pluginFn
 */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jplugins'], function(b) {
            return (root.jplugins = factory(b));
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('jplugins'));
    } else {
        // Browser globals
        root.jplugins = factory(root.b);
    }
}(typeof self !== 'undefined' ? self : this, function(b) {
    function Plugins() {
        this.jQl = function(name, plugin) {
            if (name && $isObject(plugin) && !customPlugins.hasProp(name)) {
                customPlugins.$new(name, plugin);
            } else {
                errorBuilder('Failed to register plugin, either it already exists or invalid definition');
            }
        };
    }

    Plugins.prototype.disablePlugins = function(list) {
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
    };

    Plugins.prototype.enablePlugins = function(list) {
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

    return (new Plugins);
}));