/**
 * 
 * @param {*} type 
 */
function jExport(type) {
    return new exportersModule(type);
}

function exportersModule(type) {
    if (type && this[type]) {
        return this[type]();
    }
}

exportersModule.prototype.csv = function() {
    var workbook = "",
        closed = false;

    return ({
        open: function(title) {
            if (title) {
                this.row([title]);
            }

            return ({
                row: this.row,
                close: this.close
            });
        },
        row: function(data) {
            if (data && $isArray(data)) {
                workbook += data.join(',');
            }
            //end row
            workbook += '\n';

            return ({
                row: this.row,
                close: this.close
            });
        },
        close: function() {
            if (!$isEmpty(workbook) && !closed) {
                closed = true;
            }

            return new exportGenerator(workbook, 'csv');
        }
    });
};

exportersModule.prototype.html = function() {
    var html = "",
        closed = false;

    return ({
        open: function(title) {
            html += '<html><head><title>' + ((title) ? title : "jELi HTML Export") + '</title></head><body>';
            html += '<table border="1" cellpadding="0" cellspacing="0" width="100%">';

            return ({
                row: this.row,
                close: this.close
            });
        },
        row: function(data) {
            var row = "<tr>";
            if (data && typeof data === "object") {
                for (var cell in data) {
                    row += '<td>' + JSON.stringify(data[cell]) + '</td>';
                }
            }

            row += '</tr>';

            if (!$isEmpty(html)) {
                html += row;
            }

            return ({
                row: this.row,
                close: this.close
            });
        },
        close: function() {
            if (!$isEmpty(html) && !closed) {
                html += '</table></body></html>';
                closed = true;
            }

            return new exportGenerator(html, 'html');
        }
    });
};

exportersModule.prototype.json = function() {
    var jsonExporter = [];
    return ({
        put: function(table) {
            jsonExporter = JSON.stringify((table.data || data).slice().map(function(item) {
                return item._data
            }));
        },
        close: function() {
            return new exportGenerator(jsonExporter, 'json')
        }
    });
};

exportersModule.prototype.jql = function() {
    var queries = '/** JQL **/\n/** generated ' + new Date().toLocaleString() + ' **/\n';
    return ({
        put: function(table) {
            // create table query
            try {
                queries += "create -" + table.TBL_NAME + " -" + JSON.stringify(table.columns) + '\n';
                if (!$isEmptyObject(table.index)) {
                    expect(table.index).each(function(obj, indx) {
                        queries += "alter -" + table.TBL_NAME + " -a -u -" + indx + " -" + JSON.stringify(obj) + '\n';
                    });
                }

                if (table.data.length) {
                    queries += "insert -" + JSON.stringify(table.data) + " -" + table.TBL_NAME + "  -true \n";
                }
            } catch (e) {
                queries = "/** unable to process files please try again  **/";
            }
        },
        close: function() {
            return new exportGenerator(queries, 'jql');
        }
    })
};

/**
 * 
 * @param {*} doc 
 * @param {*} fileType 
 * @param {*} fileExtension 
 */
function exportGenerator(doc, fileType) {
    function getFileName(fileName) {
        return fileName + "." + fileType;
    }


    return ({
        download: function(fileName) {
            var uri = encodeURI('data:text/' + fileType + ';charset=utf-8,' + doc),
                anchor = document.createElement('a');
            anchor.setAttribute('href', uri);
            anchor.setAttribute('download', getFileName(fileName || GUID()));
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            //initiate click
            anchor.click();
            document.body.removeChild(anchor);

            //print a message
            return 'downloading file';
        },
        print: function() {
            if (typeof doc === 'object') {
                doc = JSON.stringify(doc);
            }
            return doc;
        }
    });
}