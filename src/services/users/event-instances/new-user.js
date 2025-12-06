/**
 * 
 * @param {*} ret 
 * @param {*} res 
 */
class AddUserEventInstance extends AuthorizeUserSuccessInstance {
    constructor(res) {
        super(res.result);
        this.state = 'createUser';
        this.message = 'User Created successfully';
        this.getLastInsertId = function () {
            return res.result.lastInsertId;
        };
    }
}