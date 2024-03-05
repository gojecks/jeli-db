/**
 * 
 * @param {*} databaseInstance 
 * @returns 
 */
function SessionService(databaseInstance) {
    this.databaseInstance = databaseInstance;
    var SessionApi = function(definition) {
        this.definition = definition;
        this.check();
    };
    
    /**
     * @Method : check
     */
    SessionApi.prototype.check = function() {
        return new Promise((resolve, reject) => {
            this.get().then(res =>  {
                if (!res.result.data) {
                    databaseInstance.api('/session/create', this.definition).then(resolve, reject);
                } else {
                   resolve(res);
                }
            }, reject);
        });
    }

    /**
     * @Method : get
     */
    SessionApi.prototype.get = function() {
        return databaseInstance.api('/session', this.definition);
    };

    /**
     * @Method : put
     */
    SessionApi.prototype.put = function(postData) {
        return databaseInstance.api('/session/update', Object.assign({ content: postData }, this.definition));
    };

    /**
     * @Method : destroy
     */
    SessionApi.prototype.destroy = function() {
        return databaseInstance.api('/session/remove', this.definition);
    };

    this.createSession = function(definition){
        return new SessionApi(definition)
    };
}