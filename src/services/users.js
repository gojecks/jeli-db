/**
 * Method: _users
 * @return {*} OBJECT
 */
function ApplicationUsersApi(context) {
    Object.defineProperty(this, 'db', {
        get: function() {
            return context;
        }
    });

    this.password = {
        forgot: function(requestBody) {
            return context.api('/password/reset', requestBody);
        },
        resendCode: function(identifier) {
            return context.api('/password/code/resend', { identifier: identifier });
        },
        validateCode: function(requestBody) {
            return new Promise(function(resolve, reject) {
                context.api("/password/code/validate", requestBody)
                    .then(function(res) {
                        //resolve the promise
                        resolve(new AuthorizeUserInstance(res.result));
                    }, function(err) {
                        reject(dbErrorPromiseObject(err.message));
                    });
            });
        },
        validate: function(postData) {
            return context.api('/user/password/validate', postData);
        }
    };
};

ApplicationUsersApi.prototype.add = function(uInfo) {
    var db = this.db;
    return new Promise(function(resolve, reject) {
        var newInfo = ({ _ref: GUID(), _data: extend(true, { time: (+new Date) }, uInfo) });
        //Put the Data
        var postData = { data: { insert: [newInfo] } };
        //use the db API Method
        db.api('/user/create', postData)
            .then(function(res) {
                //Put the new user
                resolve(new AddUserEventInstance(res, newInfo));
            }, function() {
                reject(dbErrorPromiseObject('Failed to register User'));
            });
    });
};

ApplicationUsersApi.prototype.remove = function(userRef) {
    var db = this.db;
    return new Promise(function(resolve, reject) {
        var ref = {};
        ref[userRef] = true;
        db.api('/user/remove', { data: { delete: ref } })
            .then(function(res) {
                resolve(dbSuccessPromiseObject('removeUser', "User removed successfully"));
            }, function() {
                reject(dbErrorPromiseObject('Failed to remove User'));
            });
    });
}

ApplicationUsersApi.prototype.update = function(userData) {
    var db = this.db;
    return new Promise(function(resolve, reject) {
        if (userData) {
            //post our request to server
            db.api('/user/update', { data: { update: [userData] } })
                .then(function(res) {
                    resolve({
                        state: "updateUser",
                        message: "User Updated successfully",
                        result: res.result
                    });
                }, function() {
                    reject(dbErrorPromiseObject('Failed to update User, please try again later'));
                });
        }
    });
}

ApplicationUsersApi.prototype.isExists = function(queryData) {
    var db = this.db;
    return new Promise(function(resolve, reject) {
        db.api('/user/exists', queryData)
            .then(function(res) {
                resolve(res.result);
            }, function() {
                reject(dbErrorPromiseObject('please try again.'));
            });
    });
};

ApplicationUsersApi.prototype.authorize = function(queryData) {
    var db = this.db;
    return new Promise(function(resolve, reject) {
        //post our request to server
        db.api('/user/authorize', { param: queryData, limit: "JDB_SINGLE" })
            .then(function(res) {
                //resolve the promise
                resolve(new AuthorizeUserInstance(res.result));
            }, function(err) {
                reject(dbErrorPromiseObject(err.message));
            });
    });
}

ApplicationUsersApi.prototype.reAuthorize = function(data) {
    return this.db.api('/user/reauthorize', data);
};

/**
 * 
 * @param {*} postData 
 */
ApplicationUsersApi.prototype.removeAuthority = function(postData) {
    return this.db.api('/database/user/remove', postData);
}

/**
 * 
 * @param {*} postData 
 */
ApplicationUsersApi.prototype.addAuthority = function(postData) {
    return this.db.api('/database/user/add', postData)
}