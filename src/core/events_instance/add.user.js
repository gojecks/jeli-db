/**
 * 
 * @param {*} ret 
 * @param {*} res 
 */
function AddUserEventInstance(res, userInfo) {
    this.state = 'createUser';
    this.message = "User Created successfully";
    this.getUserInfo = function() {
        return userInfo._data;
    };

    this.getRef = function() {
        return userInfo._ref;
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

    Object.defineProperty(this, 'postData', {
        get: function() {
            return copy(userInfo, true);
        }
    });
}