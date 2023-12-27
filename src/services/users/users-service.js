/**
 * 
 * @param {*} dbInstance 
 */
function UserService(dbInstance) {
    this.dbInstance = dbInstance;
    this.password = {
        forgot: function(requestBody) {
            return dbInstance.api({ path: '/password/reset', data: requestBody });
        },
        resendCode: function(identifier) {
            return dbInstance.api({ path: '/password/code/resend', data: { identifier } });
        },
        validateCode: function(requestBody) {
            return dbInstance.api({ path: "/password/code/validate", data: requestBody })
                .then(function(res) {
                    //resolve the promise
                    return new AuthorizeUserInstance(res.result);
                });
        },
        validate: function(postData) {
            return dbInstance.api({ path: '/user/password/validate', data: postData });
        }
    };
};

UserService.prototype.add = function(uInfo) {
    var newInfo = ({ _ref: GUID(), _data: Object.assign({ time: (+new Date) }, uInfo) });
    //Put the Data
    //use the db API Method
    return this.dbInstance.api({ path: '/user', data: [newInfo], method: 'POST' })
        .then(function(res) {
            //Put the new user
            return new AddUserEventInstance(res, newInfo);
        });
};

UserService.prototype.remove = function(userRef) {
    return this.dbInstance.api({ path: '/user', data: [userRef], method: 'DELETE' });
}

UserService.prototype.update = function(userData) {
    //post our request to server
    return this.dbInstance.api({ path: '/user', data: [userData], method: 'PUT' });
}

UserService.prototype.isExists = function(queryData) {
    return this.dbInstance.api({ path: '/user/exists', data: queryData })
        .then(function(res) {
            return (res.result);
        });
};

UserService.prototype.authorize = function(queryData) {
    return this.dbInstance.api({ path: '/user/authorize', data: queryData })
        .then(function(res) {
            //resolve the promise
            return (new AuthorizeUserInstance(res.result));
        });
}

/**
 * 
 * @param {*} data 
 * @returns 
 */
UserService.prototype.reAuthorize = function(data) {
    return this.dbInstance.api({ path: '/user/reauthorize', data });
};

/**
 * api to query users table
 * @param {*} queryData 
 * @returns 
 */
UserService.prototype.search = function(queryData) {
    return this.dbInstance.api({ path: '/user/search', data: queryData });
}

/**
 * 
 * @param {*} postData 
 */
UserService.prototype.removeAuthority = function(postData) {
    return this.dbInstance.api({ path: '/database/user/remove', data: postData });
}

/**
 * 
 * @param {*} postData 
 */
UserService.prototype.addAuthority = function(postData) {
    return this.dbInstance.api({ path: '/database/user/add', data: postData })
}

/**
 * 
 * @param {*} authInfo 
 * returns AuthorizeUserInstance
 */
UserService.prototype.createAuthorizeInstance = function(authInfo){
    return new AuthorizeUserInstance(authInfo)
}