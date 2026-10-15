/**
 * 
 * @param {*} type 
 */
class JImportHelper {
    /**
     * 
     * @param {*} data 
     * @returns 
     */
    static generateColumns(data) {
        return data.reduce((accum, col) => {
            const [name,type] = col.split(':');
            accum[name] = {
                type: type || 'VARCHAR'
            };
            return accum
        }, {});
    }

    /**
     * 
     * @param {*} data 
     * @param {*} column 
     */
    static constructData(data, columns){
        const ref = data.unshift();
        return columns.reduce((accum, column, idx) => (accum[column] = JSON.parse(data[idx] || 'null'), accum), {});
    }

    static json(content){
        return JSON.parse(content || 'null');
    }

    static html(content) {
        const div = document.createElement('div');
        div.innerHTML = content;
        const tables = div.querySelectorAll('table');
        const jdbSchemaData = {};
        const getTrData = tds => Array.from(tds).map(col => col.textContent);
        tables.forEach(table => {
            const tableName = table.id;
            jdbSchemaData[tableName] = {};
            const trs = Array.from(table.querySelectorAll('tr'));
            const columns = getTrData(trs.shift().childNodes);
            // remove the ref column
            columns.shift();
            jdbSchemaData[tableName] = {
                type: "create",
                definition: JImportHelper.generateColumns(columns)
            };

            // extract data
            if (trs.length){
                jdbSchemaData[tableName].crud = {
                    transactions: [{
                        type: 'insert',
                        data: trs.map(tr => JImportHelper.constructData(getTrData(tr.childNodes)), columns)
                    }]
                };
            }
        })
        
        return jdbSchemaData;
    }

    static csv(content) {
        const jdbSchemaData = {};
        content.split('--table entries--').forEach(tableEntry => {
            const rows = tableEntry.split(/\r\n|\n/);
            var tableName = '';
            let columns = null;
            const data = [];

            while(rows.length){
                let row = rows.pop().trim();
                if (!row) continue;
                row = row.split(',');
                // entry
                if (row.length == 1) {
                    tableName = row[0];
                    jdbSchemaData[tableName] = {};
                } else if (rows.length > 1) {
                    // collect column from next row
                    if (!columns) {
                        // remove the ref column
                        row.shift();
                        columns = row;
                        jdbSchemaData[tableName] = {
                            type: "create",
                            definition: JImportHelper.generateColumns(columns)
                        };
                    } else {
                        // collect data
                        data.push(JImportHelper.constructData(row), columns)
                    }
                }
            }

            if (data.length) {
                if (!jdbSchemaData[tableName].crud) {
                    jdbSchemaData[tableName].crud = {
                        transactions: [{
                            type: 'insert',
                            data
                        }] 
                    };
                }
                data.length = 0;
            }
        });
        return jdbSchemaData;
    }

    static jql(content) {
        return content.split(/\r\n|\n/).filter(text => (text.trim().substr(0, 2) !== "/*"));
    }
}