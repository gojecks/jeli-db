/**
 * 
 * @param {*} res 
 */
class AuthorizeUserSuccessInstance {
    constructor(res) {
        this.state = "authorize";
        this.message = res.message || '';
        this.getUserInfo = function () {
            return res.userInfo;
        };

        this.getUserId = function () {
            return res.userId;
        };

        this.getTokens = function () {
            return res.tokens || res;
        };

        this.isPasswordReset = function () {
            return !!res.forcePasswordReset;
        };

        this.isDisabled = function () {
            return !!(res.userInfo?.disabled);
        };
    }
}


class AuthorizeUserErrorInstance {
    state = "authorize";
    constructor(err){
        
    }
}