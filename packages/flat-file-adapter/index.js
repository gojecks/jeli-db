(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but 
        // only CommonJS-like environments that support module.exports, 
        // like Node. 
        module.exports = factory();
    } else {
        // Browser globals (root is window) 
        root.flatfilePlugin = factory();
    }
}(typeof self !== 'undefined' ? self : this, function() {
    var fs = require('graceful-fs');
    var path = require('path');

    /**
     * 
     * @param {*} config 
     * @param {*} fpath 
     * @returns 
     */
    function constructFolderName(config, fpath) {
        return path.join(config.folderPath, config.name, fpath ? fpath : '');
    }

    /**
     * 
     * @param {*} config 
     * @param {*} storageUtils 
     * @param {*} CB 
     * @returns 
     */
    function FlatFileSupport(config, storageUtils, CB) {
        var _eventRegistry = new Map();
        var pendingSaving = [];
        var __locked__ = {};
        var _privateStore = {};

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
                if (!fileNames.length) {
                    return handler.onSuccess();
                }

                function readFile(filename) {
                    const content = fs.readFileSync(path.join(dirPath, filename), 'utf-8');
                    _privateStore[filename.slice(0, filename.lastIndexOf('.'))] = JSON.parse(content || '{}');
                    if (!fileNames.length) {
                        return handler.onSuccess();
                    }

                    readFile(fileNames.shift());
                }

                readFile(fileNames.shift());
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
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        /**
         * 
         * @param {*} fileName 
         */
        function getFilePath(fileName) {
            return constructFolderName(config, "/" + fileName + ".json");
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

        /**
         * public API to be used 
         */
        var _publicApi = Object({
            isExists: function(name) {
                return _privateStore.hasOwnProperty(name);
            },
            getItem: function(name) {
                if (!name) return null;
                var item = _privateStore[name];
                var isData = name.includes(':');
                if (!item && isData) {
                    name = name.split(':')[0];
                    return _privateStore[name].data;
                }

                if (item && item.schema && !isData) {
                    return item.schema;
                }

                return item;
            },
            setItem: function(name, value) {
                _privateStore[name] = value || _privateStore[name];
                writeFile(name);
            },
            clear: function() {
                _clearData(Object.keys(_privateStore));
                _privateStore = {};
            },
            removeItem: function(name) {
                delete _privateStore[name];
                _clearData([name]);
            },

            save: function(name) {
                this.setItem(name);
            },

            broadcast: function(eventName, args) {
                if (_eventRegistry.has(eventName)) {
                    _eventRegistry.get(eventName).apply(null, args);
                }
            },
        });



        /**
         * 
         * @param {*} tableName 
         * @param {*} data 
         * @param {*} insertData 
         */
        function insertEvent(tableName, data, insertData) {
            if (insertData) {
                _privateStore[tableName].data.push.apply(_privateStore[tableName].data, data);
            }
            _privateStore[tableName].schema.lastInsertId += data.length;
            _publicApi.setItem(tableName);
        }

        /**
         * 
         * @param {*} tbl 
         * @param {*} updates 
         */
        function onUpdateTableEvent(tbl, updates) {
            // save the data
            Object.keys(updates).forEach(function(key) {
                _privateStore[tbl].schema[key] = updates[key];
            });

            _publicApi.setItem(tbl);
        }

        /**
         * 
         * @param {*} version 
         * @param {*} tables 
         */
        function onResolveSchemaEvent(version, tables) {
            _publicApi.setItem('version', version);
            Object.keys(tables).forEach(function(tblName) {
                onCreateTable(tblName, tables[tblName]);
            });
        }

        /**
         * 
         * @param {*} tableName 
         * @param {*} definition 
         */
        function onCreateTable(tableName, definition) {
            /**
             * we only set data property if its a new table and not exists
             */
            if (!_privateStore.hasOwnProperty(tableName)) {
                _publicApi.setItem(tableName, {
                    schema: definition,
                    data: []
                });
            } else {
                /**
                 * extend the existing with the new
                 */
                _publicApi.setItem(tableName, Object.assign(_privateStore[tableName], {
                    schema: definition
                }));
            }
        }

        /**
         * 
         * @param {*} oldTable 
         * @param {*} newTable 
         */
        function onRenameTableEvent(oldTable, newTable) {
            _privateStore[oldTable].schema.TBL_NAME = newTable;
            _publicApi.setItem(newTable, _privateStore[oldTable]);
            _publicApi.removeItem(oldTable);
        }

        /**
         * 
         * @param {*} oldName 
         * @param {*} newName 
         * @param {*} cb 
         */
        function onRenameDataBaseEvent(oldName, newName, cb) {
            var resource = _publicApi.getItem(storageUtils.storeMapping.resourceName);
            Object.keys(resource.resourceManager).forEach(function(tbl) {
                _privateStore[tbl].schema.DB_NAME = newName;
                _privateStore[tbl].schema.lastModified = +new Date;
            });
            var clonedObject = Object.assign({}, _privateStore);
            var propertyNames = Object.keys(clonedObject);
            for (const name of propertyNames) {
                config.name = oldName;
                _publicApi.removeItem(name);
                config.nam = newName;
                _publicApi.setItem(name, clonedObject[name]);
            }
            // change the dbName variable
            config.name = newName;
            (cb || function() {})();
        }

        /**
         * 
         * @param {*} tbl 
         */
        function saveEvent(tbl) {
            _publicApi.setItem(tbl);
        }

        _eventRegistry.set('insert', insertEvent);
        _eventRegistry.set('update', saveEvent);
        _eventRegistry.set('delete', saveEvent);
        _eventRegistry.set('onAlterTable', saveEvent);
        _eventRegistry.set('onCreateTable', onCreateTable);
        _eventRegistry.set('onDropTable', _publicApi.removeItem);
        _eventRegistry.set('onUpdateTable', onUpdateTableEvent);
        _eventRegistry.set('onTruncateTable', saveEvent);
        _eventRegistry.set('onResolveSchema', onResolveSchemaEvent);
        _eventRegistry.set('onRenameTable', onRenameTableEvent);
        _eventRegistry.set('onRenameDataBase', onRenameDataBaseEvent);

        try {
            fs.mkdirSync(constructFolderName(config), { recursive: true });
            _readDir(constructFolderName(config), {
                onSuccess: function() {
                    CB();
                },
                onError: function(err) {
                    console.log('error reading file');
                }
            });
        } catch (exception) {
            console.error(exception);
        }

        return _publicApi;
    }

    /**
     * register the storage
     */
    return FlatFileSupport;
}));