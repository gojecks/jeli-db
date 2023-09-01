/**
 * 
 * @param {*} ret 
 * @param {*} res 
 */
function AddUserEventInstance(res, userInfo) {
    this.state = 'createUser';
    this.message = "User Created successfully";
    this.getUserInfo = function() {
        return res.result.userInfo || userInfo._data;
    };

    this.getUserId = function() {
        return res.result.userId || userInfo._ref;
    };

    this.getLastInsertId = function() {
        return res.result.lastInsertId;
    };

    this.getTokens = function() {
        return res.result.tokens;
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