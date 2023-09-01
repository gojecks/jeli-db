/**
 * 
 * @param {*} type 
 * @param {*} error 
 */
function TransactionErrorEvent(type, error) {
    this.error = error
    this.type = type;
}