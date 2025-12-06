/**
 * 
 * @param {*} dbInstance 
 */
class UserService {
    constructor(dbInstance) {
        this.request = payload => dbInstance.api(payload);
        this.password = new UserPasswordService(this.request);
    }
    
    add(uInfo) {
        //Put the Data
        //use the db API Method
        return this.request({ path: '/user', data: Object.assign({ time: (+new Date) }, uInfo), method: 'POST' })
            .then(res => new AddUserEventInstance(res), err => err);
    }
    
    remove(userRef) {
        return this.request({ path: '/user', data: [userRef], method: 'DELETE' });
    }
    
    update(userData) {
        //post our request to server
        return this.request({ path: '/user', data: userData, method: 'PUT' });
    }

    isExists(queryData) {
        return this.request({ path: '/user/exists', data: queryData })
            .then((res) => (res.result), err => err);
    }
    
    authorize(queryData) {
        return this.request({ path: '/user/authorize', data: queryData })
            .then(res => (new AuthorizeUserSuccessInstance(res.result || res)) , err => err);
    }
    /**
     *
     * @param {*} data
     * @returns
     */
    reAuthorize(data) {
        return this.request({ path: '/user/reauthorize', data });
    }
    /**
     * api to query users table
     * @param {*} queryData
     * @returns
     */
    search(queryData) {
        return this.request({ path: '/user/search', data: queryData });
    }
    /**
     *
     * @param {*} postData
     */
    removeAuthority(postData) {
        return this.request({ path: '/database/user/remove', data: postData });
    }
    /**
     *
     * @param {*} postData
     */
    addAuthority(postData) {
        return this.request({ path: '/database/user/add', data: postData });
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
        return this.request({ path: '/user/openid/token', data })
            .then(res => this.createAuthorizeInstance(res.result || res), err => err);
    }
};
