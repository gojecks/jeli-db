module.exports = {
    jdb: {
        files: ['./src/**/*.js', './src/api-mapping/*.json'],
        tasks: ['clean:jDist',
            'jeli-template-loader',
            'uglify'
        ]
    }
};