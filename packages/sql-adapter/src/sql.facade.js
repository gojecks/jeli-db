/**
 * thin promise wrapper over sqlitePlugin / WebSQL
 * statements are [sql, args] pairs, transactions run in the order they are issued
 */
class CoreSqlFacade {
    static quote(name) {
        return '"' + String(name).replace(/"/g, '""') + '"';
    }

    // every value is stored as JSON so strings like "123" keep their type
    static encode(value) {
        return value === undefined ? null : JSON.stringify(value);
    }

    static refOf(row) {
        return row._ref || row._id;
    }

    // rows are flat ({_id, ...columns}) or the older {_ref, _data}
    static dataOf(row) {
        var data = row._data || row;
        return Object.keys(data).reduce((accum, key) => {
            if (key !== '_id' && key !== '_ref') accum[key] = data[key];
            return accum;
        }, {});
    }

    static createTableSql(table, keyColumn, columns) {
        var definitions = [CoreSqlFacade.quote(keyColumn) + ' UNIQUE']
            .concat(columns.filter(column => column !== keyColumn).map(CoreSqlFacade.quote));
        return ['CREATE TABLE IF NOT EXISTS ' + CoreSqlFacade.quote(table) + ' (' + definitions.join(',') + ')', []];
    }

    static addColumnSql(table, column) {
        return ['ALTER TABLE ' + CoreSqlFacade.quote(table) + ' ADD COLUMN ' + CoreSqlFacade.quote(column), []];
    }

    static insertSql(table, row) {
        var data = CoreSqlFacade.dataOf(row);
        var keys = ['_ref'].concat(Object.keys(data));
        var values = [CoreSqlFacade.refOf(row)].concat(Object.keys(data).map(key => CoreSqlFacade.encode(data[key])));
        return ['INSERT OR REPLACE INTO ' + CoreSqlFacade.quote(table) + ' (' + keys.map(CoreSqlFacade.quote).join(',') + ') VALUES (' + keys.map(() => '?').join(',') + ')', values];
    }

    static updateSql(table, ref, data) {
        var keys = Object.keys(data);
        if (!keys.length) return null;
        var values = keys.map(key => CoreSqlFacade.encode(data[key])).concat([ref]);
        return ['UPDATE ' + CoreSqlFacade.quote(table) + ' SET ' + keys.map(key => CoreSqlFacade.quote(key) + '=?').join(',') + ' WHERE "_ref"=?', values];
    }

    static dropTableSql(table) {
        return ['DROP TABLE IF EXISTS ' + CoreSqlFacade.quote(table), []];
    }

    static createInstance(options) {
        var openOptions = Object.assign({}, options, { name: options.name + '.db' });
        var sqlInstance = null;
        if (window.sqlitePlugin) {
            sqlInstance = window.sqlitePlugin.openDatabase(openOptions);
        } else if (window.openDatabase) {
            sqlInstance = window.openDatabase(openOptions.name, '', openOptions.name + ' Storage for webSql', 50 * 1024 * 1024);
        }

        return new CoreSqlFacade(sqlInstance);
    }

    constructor(sqlInstance) {
        if (!sqlInstance)
            throw new TypeError('No Supported interface found for SqlAdapter');

        this.sqlInstance = sqlInstance;
    }

    /**
     * a failed statement is collected in errors and the rest of the transaction still commits
     * @param {*} statements
     */
    execute(statements) {
        statements = statements.filter(Boolean);
        if (!statements.length) {
            return Promise.resolve({ results: [], errors: [] });
        }

        return new Promise((resolve, reject) => {
            var results = [], errors = [];
            this.sqlInstance.transaction(tx => {
                statements.forEach((statement, idx) => {
                    tx.executeSql(statement[0], statement[1] || [], (_, res) => {
                        results[idx] = res;
                    }, (_, err) => {
                        errors.push(err);
                        return false;
                    });
                });
            }, reject, () => resolve({ results: results, errors: errors }));
        });
    }

    query(sql, args) {
        return this.execute([[sql, args || []]])
            .then(res => res.errors.length ? Promise.reject(res.errors[0]) : res.results[0]);
    }

    createTable(table, keyColumn, columns) {
        return this.query.apply(this, CoreSqlFacade.createTableSql(table, keyColumn, columns || []));
    }

    // existing columns fail with "duplicate column" and are ignored
    addColumns(table, columns) {
        return this.execute(columns.map(column => CoreSqlFacade.addColumnSql(table, column)));
    }

    insert(table, rows) {
        return this.execute(rows.map(row => CoreSqlFacade.insertSql(table, row)));
    }

    update(table, rows) {
        return this.execute(rows.map(row => CoreSqlFacade.updateSql(table, CoreSqlFacade.refOf(row), CoreSqlFacade.dataOf(row))));
    }

    delete(table, refs) {
        var sql = 'DELETE FROM ' + CoreSqlFacade.quote(table) + ' WHERE "_ref"=?';
        return this.execute(refs.map(ref => [sql, [typeof ref === 'object' ? CoreSqlFacade.refOf(ref) : ref]]));
    }

    truncate(table) {
        return this.query('DELETE FROM ' + CoreSqlFacade.quote(table));
    }

    select(table, limit, offset) {
        return this.query('SELECT * FROM ' + CoreSqlFacade.quote(table) + ' ORDER BY rowid LIMIT ? OFFSET ?', [limit, offset]);
    }

    renameTable(oldName, newName) {
        return this.query('ALTER TABLE ' + CoreSqlFacade.quote(oldName) + ' RENAME TO ' + CoreSqlFacade.quote(newName));
    }

    // RENAME COLUMN needs SQLite 3.25+, otherwise add the new column and copy the values across
    renameColumn(table, oldName, newName) {
        var tbl = CoreSqlFacade.quote(table);
        return this.execute([
            ['ALTER TABLE ' + tbl + ' RENAME COLUMN ' + CoreSqlFacade.quote(oldName) + ' TO ' + CoreSqlFacade.quote(newName), []],
            CoreSqlFacade.addColumnSql(table, newName),
            // qualified, so a missing column errors instead of becoming a string literal
            ['UPDATE ' + tbl + ' SET ' + CoreSqlFacade.quote(newName) + '=' + tbl + '.' + CoreSqlFacade.quote(oldName), []]
        ]);
    }

    // DROP COLUMN needs SQLite 3.35+, otherwise the column is emptied
    dropColumn(table, column) {
        var tbl = CoreSqlFacade.quote(table);
        return this.execute([
            ['ALTER TABLE ' + tbl + ' DROP COLUMN ' + CoreSqlFacade.quote(column), []],
            ['UPDATE ' + tbl + ' SET ' + CoreSqlFacade.quote(column) + '=NULL', []]
        ]);
    }

    dropTables(tables) {
        return this.execute(tables.map(CoreSqlFacade.dropTableSql));
    }
}
