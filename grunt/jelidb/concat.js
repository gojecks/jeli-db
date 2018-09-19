var jDistDirectory = './dist/';

module.exports = {
    options: {
        separator: '\n\n',
        process: true
    },
    jDBOnly: {
        dest: './dist/jdb.js',
        src: [
            '../Project-jEliJS/src/jeli-core/jeli-common/*.js',
            '../Project-jEliJS/src/jeli-core/jeli-customApi/*.js',
            '../Project-jEliJS/src/jeli-core/jeli-xhr/*.js',
            '../Project-jEliJS/src/jeli-core/jeli-miscellaneous/cookie-manager.js',
            '../Project-jEliJS/src/jeli-core/jeli-promise/*.js',
            './src/core/**/*.js',
            './src/sync/**/*.js',
            './src/storage/**/*.js',
            './src/plugins/**/*.js',
            './src/footer/**/*.js'
        ]
    }
};