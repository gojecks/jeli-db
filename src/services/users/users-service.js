/**
 * 
 * @param {*} dbInstance 
 */
class UserService {
    constructor(dbInstance) {
        this.dbInstance = dbInstance;
        this.password = {
            forgot: function (requestBody) {
                return dbInstance.api({ path: '/password/reset', data: requestBody });
            },
            resendCode: function (identifier) {
                return dbInstance.api({ path: '/password/code/resend', data: { identifier } });
            },
            validateCode: function (requestBody) {
                return dbInstance.api({ path: "/password/code/validate", data: requestBody })
                    .then(function (res) {
                        //resolve the promise
                        return new AuthorizeUserInstance(res.result);
                    });
            },
            validate: function (postData) {
                return dbInstance.api({ path: '/user/password/validate', data: postData });
            }
        };
    }
    
    add(uInfo) {
        var newInfo = ({ _ref: GUID(), _data: Object.assign({ time: (+new Date) }, uInfo) });
        //Put the Data
        //use the db API Method
        return this.dbInstance.api({ path: '/user', data: [newInfo], method: 'POST' })
            .then(function (res) {
                //Put the new user
                return new AddUserEventInstance(res, newInfo);
            });
    }
    remove(userRef) {
        return this.dbInstance.api({ path: '/user', data: [userRef], method: 'DELETE' });
    }
    update(userData) {
        //post our request to server
        return this.dbInstance.api({ path: '/user', data: [userData], method: 'PUT' });
    }
    isExists(queryData) {
        return this.dbInstance.api({ path: '/user/exists', data: queryData })
            .then(function (res) {
                return (res.result);
            });
    }
    authorize(queryData) {
        return this.dbInstance.api({ path: '/user/authorize', data: queryData })
            .then(function (res) {
                //resolve the promise
                return (new AuthorizeUserInstance(res.result));
            }, err => err);
    }
    /**
     *
     * @param {*} data
     * @returns
     */
    reAuthorize(data) {
        return this.dbInstance.api({ path: '/user/reauthorize', data });
    }
    /**
     * api to query users table
     * @param {*} queryData
     * @returns
     */
    search(queryData) {
        return this.dbInstance.api({ path: '/user/search', data: queryData });
    }
    /**
     *
     * @param {*} postData
     */
    removeAuthority(postData) {
        return this.dbInstance.api({ path: '/database/user/remove', data: postData });
    }
    /**
     *
     * @param {*} postData
     */
    addAuthority(postData) {
        return this.dbInstance.api({ path: '/database/user/add', data: postData });
    }
    /**
     *
     * @param {*} authInfo
     * returns AuthorizeUserInstance
     */
    createAuthorizeInstance(authInfo) {
        return new AuthorizeUserInstance(authInfo);
    }
    /**
     *
     * @param {*} data
     * @returns Promise
     */
    getOidcToken(data) {
        return this.dbInstance.api({ path: '/user/openid/token', data })
            .then(res => this.createAuthorizeInstance(res.result));
    }
};











