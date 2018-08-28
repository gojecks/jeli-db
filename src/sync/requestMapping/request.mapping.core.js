/**
 * Request Mapping
 */
function RequestMapping(disableAdminApi) {
    var CUSTOM_API = {};
    this.get = function(stateName) {
        if (disableAdminApi) {
            return CLIENT_REQUEST_MAPPING[stateName] || CUSTOM_API[stateName];
        }

        return CLIENT_REQUEST_MAPPING[stateName] || ADMIN_REQUEST_MAPPING[stateName] || CUSTOM_API[stateName];
    };

    this.set = function(stateName, config) {
        if (CLIENT_REQUEST_MAPPING.hasOwnProperty(state)) {
            throw new Error('StateName already Exists.');
        }

        if (!config) {
            throw new Error('Request Mapping is Required.');
        }

        CUSTOM_API[stateName] = (config);

        return this;
    };

    this.remove = function(stateName) {
        CUSTOM_API[stateName] = null;
        return this;
    }
}