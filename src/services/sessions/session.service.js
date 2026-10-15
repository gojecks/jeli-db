/**
 * 
 * @param {*} databaseInstance 
 * @returns 
 */
class SessionService {
    constructor(fetchApi) {
        this.createSession = definition => new SessionApi(definition, fetchApi);
    }
}

class SessionApi {
    constructor(definition, fetchApi) {
        this.definition = definition;
        this.fetchApi = (path, req) => fetchApi(path, req);
        this.check();
    }
    /**
     * @Method : check
     */
    check() {
        return new Promise((resolve, reject) => {
            this.get().then(res => {
                if (!res.result.data) {
                   this.fetchApi('/session/create', this.definition).then(resolve, reject);
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
        return this.fetchApi('/session', this.definition);
    }
    /**
     * @Method : put
     */
    put(postData) {
        return this.fetchApi('/session/update', Object.assign({ content: postData }, this.definition));
    }
    /**
     * @Method : destroy
     */
    destroy() {
        return this.fetchApi('/session/remove', this.definition);
    }
};




