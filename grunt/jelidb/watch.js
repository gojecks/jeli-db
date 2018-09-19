module.exports = {
    jdb: {
        files: ['./src/**/*.js'],
        tasks: ['clean:jDist',
            'concat:jDBOnly',
            'uglify:jDBOnly'
        ]
    }
};