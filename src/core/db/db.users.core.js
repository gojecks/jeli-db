/**
 * Method: _users
 * @return {*} OBJECT
 */
ApplicationInstance.prototype._users = function() {
    var _secure = '',
        _promise = new _Promise(),
        db = this,
        $defer = new DBPromise(_promise);

    /**
     * 
     * @param {*} uInfo 
     */
    function addUser(uInfo) {
        if ($isObject(uInfo)) {
            var _newInfo = ({ _ref: GUID(), _data: extend(true, { time: (+new Date) }, uInfo) }),
                //Put the Data
                postData = { data: { insert: [_newInfo] } };
            //use the db API Method
            db.api('/user/create', postData, _secure)
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
                        _promise.resolve(ret);
                    } else {
                        _promise.reject(dbErrorPromiseObject('Failed to register User'));
                    }
                }, function() {
                    _promise.reject(dbErrorPromiseObject('Failed to register User'));
                });

        }

        return $defer;
    }

    /**
     * 
     * @param {*} uInfo 
     */
    function removeUser(uInfo) {
        if ($isObject(uInfo)) {
            var ref = {};
            ref[uInfo._ref] = true;

            db.api('/user/remove', { data: { delete: ref } })
                .then(function(res) {
                    _promise.resolve(dbSuccessPromiseObject('removeUser', "User removed successfully"));
                }, function() {
                    _promise.reject(dbErrorPromiseObject('Failed to remove User'))
                });
        }

        return $defer;
    }


    /**
     * 
     * @param {*} userData 
     */
    function updateUser(userData) {
        if (userData) {
            //post our request to server
            db.api('/user/update', { data: { update: [userData] } })
                .then(function(res) {
                    res.state = "updateUser";
                    res.result.message = "User Updated successfully";
                    _promise.resolve(res);
                }, function() {
                    _promise.reject(dbErrorPromiseObject('Failed to update User, please try again later'))
                });
        }

        return $defer;
    }


    /**
     * 
     * @param {*} queryData 
     */
    function isExists(queryData) {
        db.api('/user/exists', queryData)
            .then(function(res) {
                _promise.resolve(res.result);
            }, _promise.reject);

        return $defer;
    }



    /**
     * 
     * @param {*} queryData 
     */
    function getUsers(queryData) {
        var postData = { param: queryData, limit: "JDB_SINGLE" };
        //post our request to server
        db.api('/user/authorize', postData)
            .then(function(res) {
                var ret = dbSuccessPromiseObject('authorize', "");
                ret.result.getUserInfo = function() {
                    return res.result._rec;
                };

                ret.result.getAccessToken = function() {
                    return res.result.access_info;
                };

                ret.result.isPasswordReset = function() {
                    return res.result._rec.hasOwnProperty('forcePasswordReset');
                };
                //resolve the promise
                if (!res.result.hasOwnProperty('access_info')) {
                    _promise.reject(dbErrorPromiseObject('Unable to log user in'))
                } else {
                    _promise.resolve(ret);
                }

            }, function(err) {
                _promise.reject(dbErrorPromiseObject(err.message));
            });

        return $defer;
    }

    /**
     * 
     * @param {*} data 
     */
    function reAuthorize(data) {
        return db.api('/user/reauthorize', data);;
    };

    /**
     * 
     * @param {*} postData 
     */
    function removeUserAuthority(postData) {
        return db.api('/database/user/remove', postData);
    }

    /**
     * 
     * @param {*} postData 
     */
    function addUserAuthority(postData) {
        return db.api('/database/user/add', postData)
    }

    function validatePasswd(postData) {
        return db.api('/user/password/validate', postData);
    }

    return ({
        add: addUser,
        remove: removeUser,
        authorize: getUsers,
        reAuthorize: reAuthorize,
        updateUser: updateUser,
        validatePassword: validatePasswd,
        isExists: isExists,
        addAuthority: addUserAuthority,
        removeAuthority: removeUserAuthority
    });
};