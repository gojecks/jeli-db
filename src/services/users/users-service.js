/**
 * 
 * @param {*} dbInstance 
 */
class UserService {
    constructor(fetchApi) {
        this.fetch = fetchApi;
        this.password = new UserPasswordService(fetchApi);
    }
    
    add(uInfo, withClient = null) {
        //Put the Data
        //use the db API Method
        return this.fetch({ path: '/user', data: Object.assign({ time: (+new Date) }, uInfo), method: 'POST', withClient })
            .then(res => new AddUserEventInstance(res), err => Promise.reject(err));
    }
    
    remove(userRef, withClient = null) {
        return this.fetch({ path: `/user/${userRef}`, method: 'DELETE', withClient });
    }
    
    update(userData, withClient = null) {
        //post our request to server
        return this.fetch({ path: `/user/${userData._id || userData.userId}`, data: userData, method: 'PUT', withClient });
    }

    isExists(data, withClient = null) {
        return this.fetch({ path: '/user/exists', data, withClient })
            .then((res) => (res.result), err => Promise.reject(err));
    }
    
    authorize(data, withClient = null) {
        return this.fetch({ path: '/user/authorize', data, withClient })
            .then(res => (new AuthorizeUserSuccessInstance(res.result || res)) , err => Promise.reject(err));
    }
    /**
     *
     * @param {*} data
     * @returns
     */
    reAuthorize(data) {
        return this.fetch({ path: '/user/reauthorize', method: 'POST', data });
    }
    /**
     * api to query users table
     * @param {*} data
     * @returns
     */
    search(data, withClient = null) {
        return this.fetch({ path: '/user/search', method: 'POST', data, withClient });
    }
    /**
     *
     * @param {*} postData
     */
    removeAuthority(postData) {
        return this.fetch({ path: '/database/user/remove', data: postData });
    }
    /**
     *
     * @param {*} postData
     */
    addAuthority(postData) {
        return this.fetch({ path: '/database/user/add', data: postData });
    }
    /**
     *
     * @param {*} authInfo
     * returns AuthorizeUserInstance
     */
    createAuthorizeInstance(authInfo) {
        return new AuthorizeUserSuccessInstance(authInfo);
    }
    /**
     *
     * @param {*} data
     * @returns Promise
     */
    getOidcToken(data) {
        return this.fetch({ path: '/user/openid/token', data })
            .then(res => this.createAuthorizeInstance(res.result || res), err => Promise.reject(err));
    }
};
