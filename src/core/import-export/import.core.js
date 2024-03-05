/**
 * 
 * @param {*} type 
 */
function JImport(type) {
    function generateColumns(data) {
        return data.reduce((accum, col) => {
            accum[col] = {
                type:'VARCHAR'
            };
            return accum
        }, {});
    }

    /**
     * 
     * @param {*} data 
     * @param {*} column 
     */
    function constructData(data, columns){
        var ref = data.unshift();
        return columns.reduce((accum, column, idx) => (accum._data[column] = JSON.parse(data[idx] || 'null'), accum), {
            _ref: ref,
            _data: {}
        });
    }

    return ({
        json:function(content) {
            return JSON.parse(content || 'null');
        },
        html:function(content) {
            var div = document.createElement('div');
            div.innerHTML = content;
            var tables = div.querySelectorAll('table');
            var jdbSchemaData = {};
            var getTrData = tds => Array.from(tds).map(col => col.textContent);
            tables.forEach(table => {
                var tableName = table.id;
                jdbSchemaData[tableName] = {};
                var trs = Array.from(table.querySelectorAll('tr'));
                var columns = getTrData(trs.shift().childNodes);
                // remove the ref column
                columns.shift();
                jdbSchemaData[tableName] = {
                    type: "create",
                    definition: generateColumns(columns)
                };

                // extract data
                if (trs.length){
                    jdbSchemaData[tableName].crud = {
                        transactions: [{
                            type: 'insert',
                            data: trs.map(tr => constructData(getTrData(tr.childNodes)), columns)
                        }]
                    };
                }
            })
            
            return jdbSchemaData;
        },
        csv:function(content) {
            var jdbSchemaData = {};
            var tableEntries = content.split('--table entries--');
            tableEntries.forEach(tableEntry => {
                var rows = tableEntry.split(/\r\n|\n/);
                var tableName = '';
                var columns = null;
                var data = [];
                while(rows.length){
                    var row = rows.pop().trim();
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
                                definition: generateColumns(columns)
                            };
                        } else {
                            // collect data
                            data.push(constructData(row), columns)
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
        },
        jql: function(content) {
            return content.split(/\r\n|\n/).filter(function(text) {
                return text.trim().substr(0, 2) !== "/*"
            });
        }
    })[type];
}