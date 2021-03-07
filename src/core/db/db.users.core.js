/**
 * Method: _users
 * @return {*} OBJECT
 */
function ApplicationInstanceUsers() {
    var db = this;
    /**
     * 
     * @param {*} uInfo 
     */
    function addUser(uInfo) {
        var _promise = new _Promise(),
            $defer = new DBPromise(_promise),
            _newInfo = ({ _ref: GUID(), _data: extend(true, { time: (+new Date) }, uInfo) }),
            //Put the Data
            postData = { data: { insert: [_newInfo] } };
        //use the db API Method
        db.api('/user/create', postData)
            .then(function(res) {
                //Put the new user
                var ret = new AddUserEventInstance(res, _newInfo);
                _promise.resolve(ret);
            }, function() {
                _promise.reject(dbErrorPromiseObject('Failed to register User'));
            });

        return $defer;
    }

    /**
     * 
     * @param {*} uInfo 
     */
    function removeUser(uInfo) {
        var _promise = new _Promise(),
            $defer = new DBPromise(_promise);
        if ($isObject(uInfo)) {
            var ref = {};
            ref[uInfo._ref] = true;
            /**
             * trigger api call
             */
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
        var _promise = new _Promise(),
            $defer = new DBPromise(_promise);
        if (userData) {
            //post our request to server
            db.api('/user/update', { data: { update: [userData] } })
                .then(function(res) {
                    _promise.resolve({
                        state: "updateUser",
                        message: "User Updated successfully",
                        result: res.result
                    });
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
        var _promise = new _Promise(),
            $defer = new DBPromise(_promise);
        db.api('/user/exists', queryData)
            .then(function(res) {
                _promise.resolve(res.result);
            }, function() {
                _promise.reject(dbErrorPromiseObject('please try again.'));
            });

        return $defer;
    }



    /**
     * 
     * @param {*} queryData 
     */
    function getUsers(queryData) {
        var _promise = new _Promise(),
            $defer = new DBPromise(_promise),
            postData = { param: queryData, limit: "JDB_SINGLE" };
        //post our request to server
        db.api('/user/authorize', postData)
            .then(function(res) {
                var ret = new AuthorizeUserInstance(res.result);
                //resolve the promise
                _promise.resolve(ret);
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