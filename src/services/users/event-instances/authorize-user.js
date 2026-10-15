/**
 * 
 * @param {*} res 
 */
class AuthorizeUserSuccessInstance {
    #res;

    constructor(res) {
        this.state = "authorize";
        this.message = res.message || '';
        this.#res = res;
    }

    getUserInfo() {
        return this.#res.userInfo;
    }

    getUserId() {
        return this.#res.userId;
    }

    getTokens() {
        return this.#res.tokens || this.#res;
    }

    // when a required-2FA grace period ends (seconds), or null
    getMfaSetupDueAt() {
        return this.#res.mfaSetupDueAt || null;
    }

    isPasswordReset() {
        return !!this.#res.forcePasswordReset;
    }

    isDisabled() {
        return !!(this.#res.userInfo?.disabled);
    }
}


class AuthorizeUserErrorInstance {
    state = "authorize";
    constructor(err){
        
    }
}