class TransactionManager {
    constructor() {
        this._records = {};
    }

    add(db, tbl, definition) {
        if (!this._records.hasOwnProperty(db)) {
            this._records[db] = {};
        };
    
        this._records[db][tbl] = definition;
    }

    has(db, tbl) {
        return this._records.hasOwnProperty(db) && this._records[db].hasOwnProperty(tbl);
    }

    remove(db, tbl) {
        if (this.has(db, tbl)) {
            delete this._records[db][tbl];
        }
    }
}