/**
 * 
 * @param {*} config 
 * @param {*} CB 
 */
function FlatFileSupport(config, CB) {
    var fs = require('fs'),
        mkdirp = require('mkdirp'),
        folderPath = config.folderPath + config.name + "/",
        pendingSaving = [],
        __locked__ = {},
        _privateStore = {};

    /**
     * 
     * @param {*} dirPath 
     * @param {*} handler 
     */
    function _mkDir(dirPath, handler) {
        mkdirp(dirPath, function(err) {
            if (!err) {
                handler.onSuccess();
            } else {
                handler.onError(err);
            }
        });
    }

    /**
     * 
     * @param {*} dirPath 
     * @param {*} handler 
     */
    function _readDir(dirPath, handler) {
        fs.readdir(dirPath, function(err, filenames) {
            if (err) {
                handler.onError(err);
                return;
            }

            readFiles(filenames);
        });

        /**
         * 
         * @param {*} fileNames 
         */
        function readFiles(fileNames) {
            var response = {};
            fileNames.forEach(readFile);

            function readFile(filename, idx) {
                fs.readFile(dirPath + filename, 'utf-8', function(err, content) {
                    if (err) {
                        content = null;
                    }

                    response[filename.slice(0, filename.lastIndexOf('.'))] = JSON.parse(content || '{}');
                    if (fileNames.length - 1 === idx) {
                        handler.onSuccess(response);
                    }
                });
            }

            if (!fileNames.length) {
                handler.onSuccess(response);
            }
        }
    }

    /**
     * 
     * @param {*} fileList 
     * @param {*} removeFile 
     */
    function _clearData(fileList) {
        fileList.forEach(function(fileName) {
            var filePath = getFilePath(fileName);
            fs.unlinkSync(filePath);
        });
    }

    /**
     * 
     * @param {*} fileName 
     */
    function getFilePath(fileName) {
        return folderPath + "/" + fileName + ".json";
    }

    /**
     * 
     * @param {*} fileName 
     */
    function writeFile(fileName) {
        if (__locked__[fileName]) {
            return;
        }
        /**
         * lock file
         */
        __locked__[fileName] = true;
        fs.writeFile(getFilePath(fileName),
            JSON.stringify(_privateStore[fileName], null, config.prettify || 0),
            'utf-8',
            function(err) {
                /**
                 * unlock file
                 */
                __locked__[fileName] = false;
                if (err) {
                    if (!pendingSaving.indexOf(fileName) > -1) {
                        pendingSaving.push(fileName);
                    }
                    return;
                }

                /**
                 * remove name from pending save if exists
                 */
                pendingSaving.splice(pendingSaving.indexOf(fileName), 1);
                if (pendingSaving.length) {
                    writeFile(pendingSaving.pop());
                }
            });
    }

    function PublicApi() {
        var _events = [];
        _mkDir(folderPath, {
            onSuccess: function() {
                _readDir(folderPath, {
                    onSuccess: function(contents) {
                        _privateStore = contents;
                        CB();
                    },
                    onError: function(err) {
                        console.log('error reading file');
                    }
                });
            },
            onError: function(err) {
                console.log('error creating dir');
            }
        });

        this.has = function(name) {
            return _privateStore.hasOwnProperty(name);
        };

        this.getItem = function(name) {
            return _privateStore[name];
        };

        this.setItem = function(name, value) {
            _privateStore[name] = value;
            writeFile(name);
        };
    }

    PublicApi.prototype.clear = function() {
        _clearData(Object.keys(_privateStore));
        _privateStore = {};
    };

    PublicApi.prototype.removeItem = function(name) {
        _clearData([name]);
        delete _privateStore[name];
    };

    PublicApi.prototype.save = function(name) {
        _privateStore[name].lastModified = +new Date;
        this.setItem(name, _privateStore[name]);
    };

    return new PublicApi();
}