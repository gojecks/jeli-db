/**
 * 
 * @param {*} name 
 * @param {*} columns 
 * @param {*} additionalConfig
 */
function ApplicationInstanceCreateTable(name, columns, additionalConfig) {
    var defer = new _Promise();
    var result = { state: "create" };
    var _opendedDBInstance = privateApi.getActiveDB(this.name);
    if (name && _opendedDBInstance && !_opendedDBInstance.get('$tableExist')(name)) {
        //pardon wrong columns format
        checkColumns();
        var DB_NAME = this.name,
            curTime = +new Date,
            definition = extend({
                columns: columns || [{}],
                DB_NAME: DB_NAME,
                TBL_NAME: name,
                primaryKey: null,
                foreignKey: null,
                lastInsertId: 0,
                allowedMode: { readwrite: 1, readonly: 1 },
                index: {},
                created: curTime,
                lastModified: curTime,
                _hash: GUID(),
                _previousHash: ""
            }, additionalConfig || {});

        /**
         * add table to resource
         */
        _opendedDBInstance.get('resourceManager').addTableToResource(name, {
            _hash: definition._hash,
            lastModified: definition.lastModified,
            created: definition.created
        });
        /**
         * broadcast event
         */
        privateApi.storageEventHandler.broadcast(eventNamingIndex(DB_NAME, 'onCreateTable'), [name, definition]);
        privateApi.$taskPerformer.updateDB(DB_NAME, name);

        //set the result
        result.result = TableInstance.factory(DB_NAME, name);
        result.result.message = 'Table(' + name + ') created successfully';

        defer.resolve(result);
    } else {
        result.message = (name) ? 'Table(' + name + ') already exist' : 'Table name is required';
        result.errorCode = 402;
        //reject the process
        defer.reject(result);
    }


    function checkColumns() {
        if ($isObject(columns)) {
            var nColumn = [];
            nColumn.push(columns);

            columns = nColumn;
            //empty column
            nColumn = null;
        }
    }

    return new DBPromise(defer);
};