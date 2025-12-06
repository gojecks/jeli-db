class UserPasswordService {
    constructor(request){
        this.request = request;
    }

    forgot(requestBody) {
        return this.request({ path: '/password/reset', data: requestBody });
    }

    resendCode(identifier) {
        return this.request({ path: '/password/code/resend', data: { identifier } });
    }

    validateCode(requestBody) {
        return this.request({ path: "/password/code/validate", data: requestBody })
            .then(res => new AuthorizeUserSuccessInstance(res.result || res), err => err);
    }

    validate(postData) {
        return this.request({ path: '/user/password/validate', data: postData });
    }
}