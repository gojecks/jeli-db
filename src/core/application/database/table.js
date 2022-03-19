/**
 * @param {*} name
 * @param {*} mode 
 */
function ApplicationInstanceTable(name, mode) {
    //get the requested table
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        if (name && privateApi.tableExists(dbName, name)) {
            var instance = TableInstance.factory.add(dbName, name, mode);
            resolve({ result: instance });
        } else {
            reject({ message: "There was an error, Table (" + name + ") was not found on this DB (" + dbName + ")", errorCode: 401 })
        }
    });
};

/**
 * 
 * @param {*} name 
 * @param {*} columns 
 * @param {*} additionalConfig 
 * @param {*} ignoreInstance 
 * @returns 
 */
function ApplicationInstanceCreateTable(name, columns, additionalConfig, ignoreInstance) {
    var response = { state: "create", result: null, errorCode: null, message: null };
    var _opendedDBInstance = privateApi.getActiveDB(this.name);
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        if (name && _opendedDBInstance && !privateApi.tableExists(dbName, name)) {
            //pardon wrong columns format
            checkColumns();
            var DB_NAME = dbName;
            var curTime = +new Date;
            var definition = extend({
                columns: columns || [{}],
                DB_NAME: DB_NAME,
                TBL_NAME: name,
                primaryKey: null,
                foreignKey: null,
                lastInsertId: 0,
                allowedMode: { readwrite: 1, readonly: 1 },
                proc: null,
                index: {},
                created: curTime,
                lastModified: curTime,
                _hash: GUID(),
                _previousHash: ""
            }, additionalConfig || {});

            /**
             * add table to resource
             */
            _opendedDBInstance.get(constants.RESOURCEMANAGER).addTableToResource(name, {
                _hash: definition._hash,
                lastModified: definition.lastModified,
                created: definition.created
            });
            /**
             * broadcast event
             */
            privateApi.storageEventHandler.broadcast(eventNamingIndex(DB_NAME, 'onCreateTable'), [name, definition]);
            privateApi.updateDB(DB_NAME, name);

            //set the result
            if (!ignoreInstance) {
                response.result = TableInstance.factory.add(DB_NAME, name);
            }
            response.message = 'Table(' + name + ') created successfully';

            resolve(response);
        } else {
            response.message = (name) ? 'Table(' + name + ') already exist' : 'Table name is required';
            response.errorCode = 402;
            //reject the process
            reject(result);
        }
    });


    function checkColumns() {
        if ($isObject(columns)) {
            var nColumn = [];
            nColumn.push(columns);

            columns = nColumn;
            //empty column
            nColumn = null;
        }
    }
};