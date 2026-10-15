/**
 * 
 * @param {*} ret 
 * @param {*} res 
 */
class AddUserEventInstance extends AuthorizeUserSuccessInstance {
    #result;

    constructor(res) {
        super(res.result);
        this.state = 'createUser';
        this.message = 'User Created successfully';
        this.#result = res.result;
    }

    getLastInsertId() {
        return this.#result.lastInsertId;
    }
}