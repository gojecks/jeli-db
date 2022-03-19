function TransactionManager() {
    this._records = {};
}
TransactionManager.prototype.add = function(db, tbl, definition) {
    if (!this._records.hasOwnProperty(db)) {
        this._records[db] = {};
    };

    this._records[db][tbl] = definition;
};
TransactionManager.prototype.has = function(db, tbl) {
    return this._records.hasOwnProperty(db) && this._records[db].hasOwnProperty(tbl);
};
TransactionManager.prototype.remove = function(db, tbl) {
    if (this.has(db, tbl)) {
        delete this._records[db][tbl];
    }
}