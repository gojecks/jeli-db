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
            return context.api({ path: '/password/reset', data: requestBody });
        },
        resendCode: function(identifier) {
            return context.api({ path: '/password/code/resend', data: { identifier: identifier } });
        },
        validateCode: function(requestBody) {
            return new Promise(function(resolve, reject) {
                context.api({ path: "/password/code/validate", data: requestBody })
                    .then(function(res) {
                        //resolve the promise
                        resolve(new AuthorizeUserInstance(res.result));
                    }, function(err) {
                        reject(dbErrorPromiseObject(err.message));
                    });
            });
        },
        validate: function(postData) {
            return context.api({ path: '/user/password/validate', data: postData });
        }
    };
};

ApplicationUsersApi.prototype.add = function(uInfo) {
    var db = this.db;
    var newInfo = ({ _ref: GUID(), _data: extend(true, { time: (+new Date) }, uInfo) });
    //Put the Data
    //use the db API Method
    return db.api({ path: '/user', data: [newInfo], method: 'POST' })
        .then(function(res) {
            //Put the new user
            return new AddUserEventInstance(res, newInfo);
        }, function() {
            return dbErrorPromiseObject('Failed to register User');
        });
};

ApplicationUsersApi.prototype.remove = function(userRef) {
    var db = this.db;
    return db.api({ path: '/user', data: [userRef], method: 'DELETE' })
        .then(function(res) {
            return dbSuccessPromiseObject('removeUser', "User removed successfully");
        }, function() {
            return dbErrorPromiseObject('Failed to remove User');
        });
}

ApplicationUsersApi.prototype.update = function(userData) {
    var db = this.db;
    //post our request to server
    return db.api({ path: '/user', data: [userData], method: 'PUT' })
        .then(function(res) {
            return ({
                state: "updateUser",
                message: "User Updated successfully",
                result: res.result
            });
        }, function() {
            return dbErrorPromiseObject('Failed to update User, please try again later');
        });
}

ApplicationUsersApi.prototype.isExists = function(queryData) {
    var db = this.db;
    return db.api({ path: '/user/exists', data: queryData })
        .then(function(res) {
            return (res.result);
        }, function() {
            return (dbErrorPromiseObject('please try again.'));
        });
};

ApplicationUsersApi.prototype.authorize = function(queryData) {
    var db = this.db;
    return db.api({ path: '/user/authorize', data: { param: queryData, limit: "JDB_SINGLE" } })
        .then(function(res) {
            //resolve the promise
            return (new AuthorizeUserInstance(res.result));
        }, function(err) {
            return (dbErrorPromiseObject(err.message));
        });
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
ApplicationUsersApi.prototype.reAuthorize = function(data) {
    return this.db.api({ path: '/user/reauthorize', data });
};

/**
 * api to query users table
 * @param {*} queryData 
 * @returns 
 */
ApplicationUsersApi.prototype.search = function(queryData) {
    return this.db.api({ path: '/user/search', data: queryData });
}

/**
 * 
 * @param {*} postData 
 */
ApplicationUsersApi.prototype.removeAuthority = function(postData) {
    return this.db.api({ path: '/database/user/remove', data: postData });
}

/**
 * 
 * @param {*} postData 
 */
ApplicationUsersApi.prototype.addAuthority = function(postData) {
    return this.db.api({ path: '/database/user/add', data: postData })
}