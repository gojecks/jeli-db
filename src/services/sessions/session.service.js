/**
 * 
 * @param {*} databaseInstance 
 * @returns 
 */
class SessionService {
    constructor(databaseInstance) {
        this.createSession = function (definition) {
            return new SessionApi(definition, databaseInstance);
        };
    }
}

class SessionApi {
    constructor(definition, databaseInstance) {
        this.definition = definition;
        this.databaseInstance = databaseInstance;
        this.check();
    }
    /**
     * @Method : check
     */
    check() {
        return new Promise((resolve, reject) => {
            this.get().then(res => {
                if (!res.result.data) {
                    this.databaseInstance.api('/session/create', this.definition).then(resolve, reject);
                } else {
                    resolve(res);
                }
            }, reject);
        });
    }
    /**
     * @Method : get
     */
    get() {
        return this.databaseInstance.api('/session', this.definition);
    }
    /**
     * @Method : put
     */
    put(postData) {
        return this.databaseInstance.api('/session/update', Object.assign({ content: postData }, this.definition));
    }
    /**
     * @Method : destroy
     */
    destroy() {
        return this.databaseInstance.api('/session/remove', this.definition);
    }
};




