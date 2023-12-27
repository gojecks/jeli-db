module.exports = {
    options: {
        separator: '\n\n',
    },
    coreDB: {
        dest: './dist/jdb.js',
        src: [
            './src/utils/**/*.js',
            './src/core/**/*.js',
            './src/plugins/**/*.js',
            './src/storage/**/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.jdb = factory(); } }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn Database; \n\n}))'
        }
    },
    realTimeConnector: {
        dest: './dist/connectors/realtime.js',
        src: [
            './src/connectors/realtime/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.RealTimeConnector = factory(); }   }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn RealtimeConnector; \n\n}))'
        }
    },
    SchedulerConnector: {
        dest: './dist/connectors/scheduler.js',
        src: [
            './src/connectors/schedulers/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.SchedulerConnector = factory(); }  }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn Scheduler; \n\n}))'
        }
    },
    DatabaseSyncConnector: {
        dest: './dist/connectors/sync.js',
        src: [
            './src/connectors/sync/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.DatabaseSyncConnector = factory(); }   }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn DatabaseSyncConnector; \n\n}))'
        }
    },
    UserService: {
        dest: './dist/services/users.js',
        src: [
            './src/core/helpers/common.core.js',
            './src/services/users/**/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.UserService = factory(); } }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn UserService; \n\n}))'
        }
    },
    SessionService: {
        dest: './dist/services/sessions.js',
        src: [
            './src/services/sessions/*.js'
        ],
        options: {
            banner: "(function (root, factory) { if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.SessionService = factory(); } }(typeof self !== 'undefined' ? self : this, function () {",
            footer: '\n\nreturn SessionService; \n\n}))'
        }
    }
}