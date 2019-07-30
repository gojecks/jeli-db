/**
 * 
 * @param {*} ret 
 * @param {*} res 
 */
function AddUserEventInstance(res, userInfo) {
    this.state = 'createUser';
    this.message = "User Created successfully";
    this.getUserInfo = function() {
        userInfo.__uid = this.getLastInsertId();
        return userInfo;
    };

    this.getLastInsertId = function() {
        return res.result.lastInsertId;
    };

    this.getAccessToken = function() {
        return res.result.access_info;
    };

    this.getResponseData = function() {
        return res.result;
    };
}