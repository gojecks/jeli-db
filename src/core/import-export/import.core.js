/**
 * Parses exported (or hand-written) schema files into the jdb schema format
 */
class JImportHelper {
    static STRING_TYPES = ['varchar', 'string', 'text', 'char'];
    static NUMBER_TYPES = ['number', 'int', 'integer', 'float', 'double', 'decimal'];

    /**
     *
     * @param {*} data
     * @returns
     */
    static generateColumns(data) {
        return data.reduce((accum, col) => {
            const [name, type] = col.split(':');
            accum[name.trim()] = {
                type: (type || 'VARCHAR').trim()
            };
            return accum
        }, {});
    }

    static parseValue(value, type) {
        if (value === undefined || value === '') return null;
        type = String(type).toLowerCase();
        if (JImportHelper.STRING_TYPES.includes(type)) return value;
        if (JImportHelper.NUMBER_TYPES.includes(type) && value.trim() && !isNaN(value)) return Number(value);
        try {
            return JSON.parse(value);
        } catch (e) {
            return value;
        }
    }

    /**
     * maps a row (ref column already removed) to a record using the column definition
     * @param {*} values
     * @param {*} definition
     */
    static constructData(values, definition) {
        return Object.keys(definition).reduce((accum, column, idx) => {
            accum[column] = JImportHelper.parseValue(values[idx], definition[column].type);
            return accum;
        }, {});
    }

    // RFC 4180 rows: quoted cells may hold commas, quotes ("") and newlines
    static parseCsvRows(text) {
        const rows = [];
        let row = [], cell = '', quoted = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (quoted) {
                if (char == '"' && text[i + 1] == '"') {
                    cell += '"';
                    i++;
                } else if (char == '"') {
                    quoted = false;
                } else {
                    cell += char;
                }
            } else if (char == '"' && !cell) {
                quoted = true;
            } else if (char == ',') {
                row.push(cell);
                cell = '';
            } else if (char == '\n' || char == '\r') {
                if (char == '\r' && text[i + 1] == '\n') i++;
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += char;
            }
        }

        if (cell || row.length) {
            row.push(cell);
            rows.push(row);
        }

        return rows.filter(cells => cells.some(c => c.trim()));
    }

    static buildTable(columns, rows) {
        // first column is the exported ref
        const definition = JImportHelper.generateColumns(columns.slice(1));
        const table = { type: "create", definition };
        if (rows.length) {
            table.crud = {
                transactions: [{
                    type: 'insert',
                    data: rows.map(values => JImportHelper.constructData(values.slice(1), definition))
                }]
            };
        }

        return table;
    }

    static json(content) {
        return JSON.parse(content || 'null');
    }

    // server migration files (schema/<version>.json): [{type, config}, ...]
    static isMigration(data) {
        return Array.isArray(data) && data.length > 0 && data.every(op => op && typeof op == 'object' && typeof op.type == 'string' && op.config && typeof op.config == 'object');
    }

    static migration(ops) {
        const jdbSchemaData = {};
        const add = (table, entry) => {
            if (!table) return;
            (jdbSchemaData[table] = jdbSchemaData[table] || []).push(entry);
        };

        ops.forEach(op => {
            const config = op.config;
            switch (String(op.type).toLowerCase()) {
                case 'create': {
                    // platform shape {schema: {TBL_NAME, columns, ...}, records}, template shape {name, columns}
                    const schema = config.schema || { TBL_NAME: config.name, columns: config.columns };
                    const entry = {
                        type: 'create',
                        definition: schema.columns || {},
                        additionalConfig: ['primaryKey', 'foreignKey', 'index', 'allowedMode', 'policies', 'events']
                            .reduce((accum, key) => (key in schema && (accum[key] = schema[key]), accum), {})
                    };
                    if (Array.isArray(config.records) && config.records.length) {
                        entry.crud = { transactions: [{ type: 'insert', data: config.records }] };
                    }
                    add(schema.TBL_NAME, entry);
                    break;
                }
                case 'drop':
                    (config.collections || []).forEach(table => add(table, { type: 'drop' }));
                    break;
                case 'rename':
                    Object.keys(config.collections || {}).forEach(table => add(table, { type: 'rename', name: config.collections[table] }));
                    break;
                case 'truncate':
                    add(config.name, { type: 'truncate' });
                    break;
                case 'clone':
                    add(config.target, { type: 'clone', from: config.source });
                    break;
                case 'alter':
                    add(config.name, { type: 'alter', columns: config.columns || [] });
                    break;
                default:
                    // e.g. rebuildIndex: server-side only
                    (config.collections || [config.name]).forEach(table => add(table, { type: op.type, serverOnly: true }));
            }
        });

        return jdbSchemaData;
    }

    static html(content) {
        // DOMParser documents never run scripts or inline handlers from the imported file
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const jdbSchemaData = {};
        const getCells = tr => Array.from(tr.cells).map(cell => cell.textContent);
        doc.querySelectorAll('table').forEach(table => {
            const trs = Array.from(table.querySelectorAll('tr'));
            if (!table.id || !trs.length) return;
            jdbSchemaData[table.id] = JImportHelper.buildTable(getCells(trs.shift()), trs.map(getCells));
        });

        return jdbSchemaData;
    }

    static csv(content) {
        const jdbSchemaData = {};
        content.split(/\r?\n--table entries--\r?\n/).forEach(tableEntry => {
            const rows = JImportHelper.parseCsvRows(tableEntry);
            if (rows.length < 2) return;
            const tableName = rows.shift()[0].trim();
            const columns = rows.shift();
            jdbSchemaData[tableName] = JImportHelper.buildTable(columns, rows);
        });
        return jdbSchemaData;
    }

    static jql(content) {
        return content.split(/\r\n|\n/).filter(text => {
            text = text.trim();
            return text && !text.startsWith('/*');
        });
    }
}
