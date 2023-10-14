module.exports = {
    options: {
        separator: '\n\n'
    },
    jDBOnly: {
        dest: './dist/jdblite.js',
        src: [
            './src/utils/**/*.js',
            './src/core/**/*.js',
            './src/plugins/**/*.js',
            './src/storage/**/*.js'
        ],
        options: {
            wrap: {
                type: 'UMD',
                data: {
                    moduleName: 'jdb',
                    returnObj: 'Database'
                }
            }
        }
    },
    forUglify: {
        dest: './dist/jdb.js',
        src: [
            './src/utils/**/*.js',
            './src/core/**/*.js',
            './src/services/**/*.js',
            './src/plugins/**/*.js',
            './src/storage/**/*.js'
        ],
        options: {
            wrap: {
                type: 'UMD',
                data: {
                    moduleName: 'jdb',
                    returnObj: 'Database'
                }
            }
        }
    }
}