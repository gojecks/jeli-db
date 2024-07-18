/**
 * @param {*} name
 * @param {*} mode 
 */
function DatabaseInstanceTable(name, mode) {
    //get the requested table
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        var instance = DatabaseInstanceTable.async(dbName, name, mode);
        if (instance) {
            resolve({ result: instance });
        } else {
            reject({ message: "There was an error, Table (" + name + ") was not found on this DB (" + dbName + ")", errorCode: 401 })
        }
    });
};

/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 * @param {*} mode 
 * @returns 
 */
DatabaseInstanceTable.async = function(dbName, tableName, mode) {
    if (tableName && privateApi.tableExists(dbName, tableName)) {
        return TableInstance.factory.add(dbName, tableName, mode);
    }

    return null;
};

/**
 * 
 * @param {*} name 
 * @param {*} columns 
 * @param {*} additionalConfig 
 * @param {*} ignoreInstance 
 * @returns 
 */
function DatabaseInstanceCreateTable(name, columns, additionalConfig, ignoreInstance) {
    var dbName = this.name;
    return new DBPromise(function(resolve, reject) {
        var response = DatabaseInstanceCreateTable.async(dbName, name, columns, additionalConfig, ignoreInstance);
        if (!response.errorCode) {
            resolve(response);
        } else {
            //reject the process
            reject(response);
        }
    });
}

function checkColumns(columns) {
    if (isobject(columns)) {
        var nColumn = [];
        nColumn.push(columns);
        columns = nColumn;
        //empty column
        nColumn = null;
    }

    return columns;
}


/**
 * 
 * @param {*} dbName 
 * @param {*} tableName 
 * @param {*} columns 
 * @param {*} additionalConfig 
 * @param {*} ignoreInstance 
 */
DatabaseInstanceCreateTable.async = function(dbName, tableName, columns, additionalConfig, ignoreInstance) {
    var response = { state: "create", result: null, errorCode: null, message: null };
    var _opendedDBInstance = privateApi.getActiveDB(dbName);
    if (tableName && _opendedDBInstance && !privateApi.tableExists(dbName, tableName)) {
        //pardon wrong columns format
        columns = checkColumns(columns);
        var curTime = +new Date;
        var definition = extend({
            columns: columns || [{}],
            DB_NAME: dbName,
            TBL_NAME: tableName,
            primaryKey: null,
            foreignKey: null,
            lastInsertId: 0,
            allowedMode: { readwrite: 1, readonly: 1 },
            proc: null,
            index: {},
            created: curTime,
            alias: '',
            lastModified: curTime,
            _hash: GUID(),
            _previousHash: ''
        }, additionalConfig || {});

        /**
         * add table to resource
         */
        _opendedDBInstance.get(constants.RESOURCEMANAGER).addTableToResource(tableName, {
            _hash: definition._hash,
            lastModified: definition.lastModified,
            created: definition.created
        });
        /**
         * broadcast event
         */
        privateApi.storageFacade.broadcast(dbName, DB_EVENT_NAMES.CREATE_TABLE, [tableName, definition]);
        privateApi.updateDB(dbName, tableName);
        //set the result
        if (!ignoreInstance) {
            response.result = TableInstance.factory.add(dbName, tableName);
        }
        response.message = 'Table(' + tableName + ') created successfully';
    } else {
        response.message = (tableName) ? 'Table(' + tableName + ') already exist' : 'Table name is required';
        response.errorCode = 402;
    }

    return response;
}