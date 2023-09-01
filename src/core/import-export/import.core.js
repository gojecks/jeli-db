/**
 * 
 * @param {*} type 
 */
function importModules(type) {
    var okeys;
    this.fileData = { columns: [], data: [], skippedData: [], _type: type, schema: {} };
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
            if (data[i] && !isempty(data[i][0])) {
                var value = data[i][0].split(",");
                this.setValue(value);
            }
        }
    };
}

importModules.prototype.json = function(content) {
    if (content) {
        var parsedContent = JSON.parse(content);
        if (isarray(parsedContent)) {
            this.fileData.data = parsedContent
            this.fileData.columns = Object.keys(this.fileData.data[0]);
        } else {
            this.fileData.schema = parsedContent;
        }
    }
    return this.fileData;
};

importModules.prototype.html = function(content) {
    var div = document.createElement('div');
    div.innerHTML = content;
    var tr = div.querySelectorAll('tr');
    var lines = [];

    /**
     * 
     * @param {*} row 
     * @returns 
     */
    function removeTD(row) {
        var tarr = [];
        var data = [];

        row.forEach(td => data.push(td.textContent));
        tarr.push(data.join(','));
        return tarr;
    }
    
    tr.forEach(trow  =>  {
        if (trow.tagName) {
            lines.push(removeTD(trow.childNodes));
        }
    });

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
        return text.trim().substr(0, 2) !== "/*"
    });

    return this.fileData;
}