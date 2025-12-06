/**
 * 
 * @param {*} type 
 * @param {*} error 
 */
class TransactionErrorEvent{
    constructor(type, error) {
        this.error = error
        this.type = type;
    }
}