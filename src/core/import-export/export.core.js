
class jExport {
    static getFileName(fileName) {
        return fileName + "." + type;
    }

    static exporterAction = doc => ({
        download: (fileName) => {
            if (isobject(doc)) {
                doc = JSON.stringify(doc, null, 3);
            }

            var uri = encodeURI('data:text/' + type + ';charset=utf-8,' + doc),
                anchor = document.createElement('a');
            anchor.setAttribute('href', uri);
            anchor.setAttribute('download', jExport.getFileName(fileName || GUID()));
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            //initiate click
            anchor.click();
            document.body.removeChild(anchor);

            //print a message
            return 'downloading file';
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
        return [cdata._ref].concat(Object.values(cdata._data).map(item => (isobject(item) ? JSON.stringify(item) : item)));
    }

    static handlers = {
        csv() {
            var documents = [];
            return ({
                put: function (tableName, columns, tableData) {
                    var document = [tableName];
                    document.push(['ref'].concat(columns).join(','));
                    if (Array.isArray(tableData) && tableData.length) {
                        for (var data of tableData) {
                            document.push(jExport.getValueInArray(data).join(','));
                        }
                    }
                    documents.push(document.join('\n'))
                },
                close: () => jExport.exporterAction(documents.join('\n--table entries--\n'))
            });
        },
    
        html(title) {
            var document = ['<html><head><title>' + title + '</title></head><body>'];
            /**
             * @param {*} data 
             */
            function pushRow(data) {
                return '<tr>' + data.map(cData => '<td>' + cData + '</td>').join('') + '</tr>';
            }
    
            return ({
                put: function (tableName, columns, tableData) {
                    document.push('<h4>Table: ' + tableName + '</h4>');
                    document.push('<table border="1" cellpadding="0" cellspacing="0" style="margin-bottom:1em" width="100%" id="' + tableName + '">');
                    document.push(pushRow(['ref'].concat(columns)));
                    if (Array.isArray(tableData) && tableData.length) {
                        for (var data of tableData) {
                            document.push(jExport.getValueInArray(data));
                        }
                    }
                    document.push('</table>');
                },
                close: () => {
                    document.push('</body></html>');
                    return jExport.exporterAction(document.join('\n'));
                }
            });
        },
    
        json() {
            var jsonExporter = {};
            var additionalConfig = ["primaryKey", "foreignKey", "lastInsertId", "allowedMode", "index", "_hash", "_previousHash", "lastModified", "lastSyncedDate"];
            return ({
                put: function (tableSchema, tableData) {
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
                close: () => jExport.exporterAction(jsonExporter)
            });
        },
        jql() {
            var queries = ['/** JQL **/\n/** generated ' + new Date().toLocaleString() + ' **/'];
            return ({
                put: function (tableSchema, tableData) {
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
                close: () => jExport.exporterAction(queries.join('\n'))
            })
        }
    };
}

