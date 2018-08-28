//@FileReader

function jFileReader() {
    var handler = {
        onselect: function() {},
        onSuccess: function() {},
        onError: function() {},
        onload: function loadHandler(event) {
            processData(event.target.result);
        },
        selectedFile: null
    };


    /**
     * 
     * @param {*} content 
     */
    function processData(content) {
        //initialize the file
        var fileType = handler.selectedFile.name.split('.')[1],
            importModule = new importModules(fileType);
        if (fileType && importModule[fileType]) {
            handler.onSuccess(importModule[fileType](content));
        } else {
            handler.onError("Unsupported File Format");
        }
    }

    function handleSelectedFile() {
        if (handler.selectedFile) {
            var reader = new FileReader();
            // Read file into memory as UTF-8      
            reader.readAsText(handler.selectedFile);
            // Handle errors load
            reader.onload = handler.onload;
            reader.onerror = handler.onError;
        }

    }

    this.start = function(handlers) {
        if (handlers) {
            handler = extend(handler, handlers);
        }

        var input = element("<input type='file'/>");
        input
            .bind('change', function(e) {
                handler.onselect(this.files[0].name, this.files);
                handler.selectedFile = this.files[0];
                handleSelectedFile();
                input.remove();
            })
            .css({ top: "-10000px", position: "absolute" })
            .appendTo('body');

        input[0].click();

        return ({
            getFile: function() {
                return handler.selectedFile;
            },
            getData: function() {
                return fileData;
            }
        });
    };
}

/**
 * 
 * @param {*} type 
 */

function importModules(type) {
    var okeys;
    this.fileData = { columns: [], data: [], skippedData: [], _type: type };
    /**
     * 
     * @param {*} cdata 
     */
    this.setValue = function(cdata) {
        var ret = {};
        if (okeys.length === cdata.length) {
            for (var i in cdata) {
                ret[okeys[i]] = ((!isNaN(Number(cdata[i]))) ? Number(cdata[i]) : cdata[i]);
            }

            this.fileData.data.push(ret);
        } else {
            this.fileData.skippedData.push(cdata);
        }
    }

    this.setData = function(data) {
        okeys = this.fileData.columns = data[0][0].split(",");
        for (var i = 1; i <= data.length; i++) {
            if (data[i] && !$isEmpty(data[i][0])) {
                var value = data[i][0].split(",");
                this.setValue(value);
            }
        }
    };
}

importModules.prototype.json = function(content) {
    this.fileData.data = JSON.parse(content || '[]');
    this.fileData.columns = Object.keys(this.fileData.data[0]);
    return this.fileData;
};

importModules.prototype.html = function(content) {
    var div = element('<div />').html(content),
        tr = div[0].querySelectorAll('tr'),
        lines = [];

    //Function to remove td 
    function removeTD(row) {
        var td = row.childNodes,
            tarr = [],
            data = [];
        expect(td).each(function(_td) {
            data.push(_td.textContent);
        });

        tarr.push(data.join(','));
        //return tarr
        return tarr;
    }

    if (tr.length) {
        expect(tr).each(function(trow) {
            if (trow.tagName) {
                lines.push(removeTD(trow));
            }
        });
    }

    this.setData(lines);
    return this.fileData;
};

importModules.prototype.csv = function(content) {
    var allTextLines = content.split(/\r\n|\n/);
    var lines = [];
    for (var i = 0; i < allTextLines.length; i++) {
        var data = allTextLines[i].split(';');
        var tarr = [];
        for (var j = 0; j < data.length; j++) {
            tarr.push(data[j]);
        }

        lines.push(tarr);
    }

    this.setData(lines);
    return this.fileData;
};

importModules.prototype.jql = function(content) {
    this.fileData.data = content.split(/\r\n|\n/).filter(function(text) {
        return text.trim().substr(0, 1) !== "#"
    });

    return this.fileData;
}