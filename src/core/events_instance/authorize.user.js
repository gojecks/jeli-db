/**
 * 
 * @param {*} res 
 */
function AuthorizeUserInstance(res) {
    this.state = "authorize";
    this.message = "";
    this.getUserInfo = function() {
        return res._rec;
    };

    this.getAccessToken = function() {
        return res.access_info;
    };

    this.isPasswordReset = function() {
        return res._rec.hasOwnProperty('forcePasswordReset');
    };
}