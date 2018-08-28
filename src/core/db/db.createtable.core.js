/** Create DBEVENT Prototype **/
DBEvent.prototype.createTbl = function(name, columns) {
    var defer = new $p(),
        result = { state: "create" };
    if (name && !$queryDB.$getActiveDB(this.name).$get('$tableExist')(name)) {
        //pardon wrong columns format
        if ($isObject(columns)) {
            var nColumn = [];
            nColumn.push(columns);

            columns = nColumn;
            //empty column
            nColumn = null;
        }

        var DB_NAME = this.name,
            curTime = +new Date;
        $queryDB.$newTable(this.name, name, ({
            columns: columns || [{}],
            data: [],
            DB_NAME: DB_NAME,
            TBL_NAME: name,
            "primaryKey": null,
            "foreignKey": null,
            lastInsertId: 0,
            allowedMode: { readwrite: 1, readonly: 1 },
            index: {},
            created: curTime,
            lastModified: curTime,
            $hash: GUID(),
        }));

        /**
          broadcast event
        **/
        $queryDB.storageEventHandler.broadcast(eventNamingIndex(DB_NAME, 'onCreateTable'), [name, columns]);

        //set the result
        result.result = new jEliDBTBL($queryDB.$getTable(DB_NAME, name));
        result.result.message = 'Table(' + name + ') created successfully';

        defer.resolve(result);
    } else {
        result.message = (name) ? 'Table(' + name + ') already exist' : 'Table name is required';
        result.errorCode = 402;
        //reject the process
        defer.reject(result);
    }

    return new DBPromise(defer);
};