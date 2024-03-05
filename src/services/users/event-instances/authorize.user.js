/**
 * 
 * @param {*} res 
 */
function AuthorizeUserInstance(res) {
    this.state = "authorize";
    this.message = "";
    this.getUserInfo = function() {
        return res.userInfo;
    };

    this.getUserId = function() {
        return res.userId;
    };

    this.getTokens = function() {
        return res.tokens;
    };

    this.isPasswordReset = function() {
        return res.forcePasswordReset;
    };

    this.isDisabled = function() {
        return res.userInfo.disabled;
    }
}