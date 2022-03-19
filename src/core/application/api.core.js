//api AJAX request
//@params : request Type , State , postData, table_name
//

/**
 * 
 * @param {*} URL
 * @param {*} postData 
 * @param {*} tbl 
 * requestState can either be a STRING or OBJECT 
 * { 
 *   URL:STRING,
 *   tbl:String,
 *   AUTH_TYPE:Boolean,
 *   METHOD:STRING, data:ANY
 * }
 */

function ApplicationInstanceApi(URL, postData, tbl) {
    var options = privateApi.buildOptions(this.name, tbl, URL);
    // set the postData
    if (postData) {
        if (options.type && $isEqual(options.type.toLowerCase(), 'get')) {
            options.data.query = postData;
        } else if (postData instanceof FormData) {
            // append all data into formData
            for (var prop in options.data) {
                postData.append(prop, options.data[prop]);
            }
            options.data = postData;
            options.contentType = false;
            options.processData = false;
        } else {
            options.data.postData = postData;
        }
    }

    return privateApi.$http(options).then(function(res) {
        var ret = dbSuccessPromiseObject('api', "");
        ret.result = res;
        return ret;
    }, function(err) {
        return (err.data || { message: "There was an error please try again later" });
    });
};

/**
 * Add a localTransport using iframe
 * used only for loading local data
 */
ApplicationInstanceApi.localTransport = function(url, success, error) {
    if (!window) {
        errorBuilder('LocalTransport can only be used on a Browser instance');
    }

    /**
     * create our transport
     */
    var iframe = document.createElement('iframe');
    iframe.style.display = "none";
    iframe.style.height = "0px";
    iframe.style.left = "-5000px";
    iframe.src = url;
    iframe.onload = function() {
        var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
        var content = iframeDocument.documentElement.querySelector('pre').innerText;
        if (content) {
            var parsedContent;
            try {
                parsedContent = JSON.parse(content);
            } catch (e) {
                parsedContent = content;
            };

            success(parsedContent);
            parsedContent = null;
            content = null;
            iframeDocument = null;
        }
        removeFrame();
    };

    iframe.onerror = function() {
        error({ message: 'unable to load data' });
        removeFrame();
    };

    function removeFrame() {
        document.body.removeChild(iframe);
    }

    document.body.appendChild(iframe);
}