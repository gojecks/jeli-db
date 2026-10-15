
class jExport {
    static getFileName(fileName, type) {
        return fileName + "." + type;
    }

    static exporterAction = (doc, type) => ({
        download: (fileName) => {
            if (isobject(doc)) {
                doc = JSON.stringify(doc, null, 3);
            }

            fileName = `${(fileName || GUID())}.${type}`;
            const uri = encodeURI('data:text/' + type + ';charset=utf-8,' + doc),
                anchor = document.createElement('a');
            anchor.setAttribute('href', uri);
            anchor.setAttribute('download', fileName);
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            //initiate click
            anchor.click();
            document.body.removeChild(anchor);

            //print a message
            return `downloading file: ${fileName}`;
        },
        print: () => {
            if (typeof doc === 'object') {
                doc = JSON.stringify(doc, null, 3);
            }
            return doc;
        }
    });

    //getValue
    static getValueInArray(cdata) {
        return [cdata._ref || cdata._id].concat(Object.values(cdata._data || cdata).map(item => (isobject(item) ? JSON.stringify(item) : item)));
    }

    static handlers = {
        csv() {
            const documents = [];
            return ({
                put: (tableName, columns, tableData) => {
                    const document = [tableName];
                    document.push(['ref'].concat(columns).join(','));
                    if (Array.isArray(tableData) && tableData.length) {
                        for (var data of tableData) {
                            document.push(jExport.getValueInArray(data).join(','));
                        }
                    }
                    documents.push(document.join('\n'))
                },
                close: () => jExport.exporterAction(documents.join('\n--table entries--\n'), 'csv')
            });
        },

        html(title) {
            const document = [`<html><head><title>${title}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"/></head><body><div class="container">`];
            /**
             * @param {*} data 
             */
            function pushRow(data) {
                return '<tr>' + data.map(cData => `<th>${cData}</th>`).join('') + '</tr>';
            }

            return ({
                put: (tableName, columns, tableData) => {
                    document.push('<h4>Table: ' + tableName + '</h4>');
                    document.push('<table class="table table-bordered" id="' + tableName + '">');
                    document.push(`<thead>${pushRow(['ref'].concat(columns))}</thead>`);
                    if (Array.isArray(tableData) && tableData.length) {
                        document.push(`<tbody>`);
                        for (const data of tableData) {
                            document.push(pushRow(jExport.getValueInArray(data)));
                        }
                        document.push(`</tbody>`);
                    }
                    document.push('</table>');
                },
                close: () => {
                    document.push('</div></body></html>');
                    return jExport.exporterAction(document.join('\n'), 'html');
                }
            });
        },

        json() {
            var jsonExporter = {};
            var additionalConfig = ["primaryKey", "foreignKey", "lastInsertId", "allowedMode", "index", "_hash", "_previousHash", "lastModified", "lastSyncedDate"];
            return ({
                put: (tableSchema, tableData) => {
                    jsonExporter[tableSchema.TBL_NAME] = {
                        type: "create",
                        definition: tableSchema.columns,
                        additionalConfig: additionalConfig.reduce((accum, key) => (accum[key] = tableSchema[key], accum), {})
                    };

                    if (Array.isArray(tableData) && tableData.length) {
                        jsonExporter[tableSchema.TBL_NAME].crud = {
                            transactions: [{
                                type: 'insert',
                                data: tableData,
                            }]
                        }
                    }
                },
                close: () => jExport.exporterAction(jsonExporter, 'json')
            });
        },
        jql() {
            const queries = ['/** JQL **/\n/** generated ' + new Date().toLocaleString() + ' **/'];
            return ({
                put: (tableSchema, tableData) => {
                    queries.push('/** Start Table ' + tableSchema.TBL_NAME + ' schema entry **/');
                    // create table query
                    try {
                        queries.push("create -" + tableSchema.TBL_NAME + " -" + JSON.stringify(tableSchema.columns));
                        if (!isemptyobject(tableSchema.index)) {
                            queries.push("alter -" + tableSchema.TBL_NAME + " -a -u -" + JSON.stringify(tableSchema.index));
                        }

                        if (Array.isArray(tableData) && tableData.length) {
                            queries.push("insert -" + JSON.stringify(tableData) + " -" + tableSchema.TBL_NAME + "  -hard");
                        }
                        queries.push('/** End Table ' + tableSchema.TBL_NAME + ' schema entry **/');
                    } catch (e) {
                        queries = ["/** unable to process files please try again  **/"];
                    }
                },
                close: () => jExport.exporterAction(queries.join('\n'), 'jql')
            })
        }
    };
}

