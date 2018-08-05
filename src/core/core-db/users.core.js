/**
 * Method: _users
 * @return {*} OBJECT
 */
DBEvent.prototype._users = function() {

    var syncService = new jEliDBSynchronization(this.name)
        .Entity()
        .configSync({}),
        _secure = '_.users_',
        $promise = new $p(),
        db = this,
        $defer = new DBPromise($promise);

    //Add user
    function addUser(uInfo) {
        if ($isObject(uInfo)) {
            var _newInfo = ({ _ref: GUID(), _data: extend(true, { time: (+new Date), access: "*" }, uInfo) }),
                //Put the Data
                postData = { data: { insert: [_newInfo] } };
            //use the db API Method
            db.api('PUT', 'crusr', postData, _secure)
                .then(function(res) {
                    //Put the new user
                    var ret = dbSuccessPromiseObject('createUser', "User Created successfully");
                    //if direct login after login
                    //set the getUserInfo and getAccessToken
                    ret.result.getUserInfo = function() {
                        delete _newInfo._data.time;
                        delete _newInfo._data.access;
                        _newInfo.__uid = res.result.lastInsertId;
                        return _newInfo;
                    };

                    ret.result.getLastInsertId = function() {
                        return res.result.lastInsertId;
                    };

                    ret.result.getAccessToken = function() {
                        return res.result.access_info;
                    };

                    ret.getResponseData = function() {
                        return res.result;
                    };

                    if (res.result.ok) {
                        $promise.resolve(ret);
                    } else {
                        $promise.reject(dbErrorPromiseObject('Failed to register User'));
                    }
                }, function() {
                    $promise.reject(dbErrorPromiseObject('Failed to register User'));
                });

        }

        return $defer;
    }

    //removeUser
    function removeUser(uInfo) {
        if ($isObject(uInfo)) {
            syncService
                .delete(_secure, [uInfo])
                .then(function(res) {
                    $promise.resolve(dbSuccessPromiseObject('removeUser', "User removed successfully"));
                }, function() {
                    $promise.reject(dbErrorPromiseObject('Failed to remove User'))
                });
        }

        return $defer;
    }


    //updateUsers 
    function updateUser(userData) {
        if (userData) {
            //post our request to server
            db.api('PUT', 'upusr', { data: { update: [userData] } }, _secure)
                .then(function(res) {
                    res.state = "updateUser";
                    res.result.message = "User Updated successfully";
                    $promise.resolve(res);
                }, function() {
                    $promise.reject(dbErrorPromiseObject('Failed to update User, please try again later'))
                });
        }

        return $defer;
    }


    /**
      Method: isExists
    **/
    function isExists(queryData) {
        syncService
            .getNumRows(queryData, _secure)
            .then(function(res) {
                $promise.resolve({ isExists: res._jDBNumRows > 0 });
            }, $defer.reject);

        return $defer;
    }



    //getUser
    function getUsers(queryData) {
        var postData = { param: queryData, limit: "JDB_SINGLE" };
        //post our request to server
        db.api('POST', 'authusr', postData, _secure)
            .then(function(res) {
                var ret = dbSuccessPromiseObject('authorize', ""),
                    isAuthorized = res.result._rec.length;
                ret.result.getUserInfo = function() {
                    return res.result._rec[0];
                };

                ret.result.getAccessToken = function() {
                    return res.result.access_info;
                };
                //resolve the promise
                if (!isAuthorized) {
                    $promise.reject(dbErrorPromiseObject('Unable to log user in'))
                } else {
                    $promise.resolve(ret);
                }

            }, function() {
                $promise.reject(dbErrorPromiseObject('Unable to log user in'));
            });

        return $defer;

    }

    return ({
        add: addUser,
        remove: removeUser,
        authorize: getUsers,
        updateUser: updateUser,
        isExists: isExists
    });
};