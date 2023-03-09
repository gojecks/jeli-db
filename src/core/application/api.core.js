//api AJAX request
//@params : request Type , State , postData, table_name
//

/**
 * 
 * @param {*} URL
 * @param {*} postData 
 * @param {*} tbl 
 * @param {*} method
 * requestState can either be a STRING or OBJECT 
 * { 
 *   path:STRING,
 *   tbl:String,
 *   AUTH_TYPE:Boolean,
 *   METHOD:STRING, data:ANY,
 *   cache: boolen|{cacheId:string,ttl:number}
 * }
 */

function ApplicationInstanceApi(path) {
    var options = isobject(path) ? path : { path: path };
    var httpRequestOptions = privateApi.buildHttpRequestOptions(this.name, options);
    // set the postData
    if (options.data && !httpRequestOptions.isErrorState) {
        if (httpRequestOptions.type && isequal(httpRequestOptions.type.toLowerCase(), 'get')) {
            httpRequestOptions.data.query = options.data;
        } else if (options.data instanceof FormData) {
            // append all data into formData
            for (var prop in httpRequestOptions.data) {
                options.data.append(prop, httpRequestOptions.data[prop]);
            }
            httpRequestOptions.data = options.data;
            httpRequestOptions.contentType = false;
            httpRequestOptions.processData = false;
        } else {
            httpRequestOptions.data.postData = options.data;
        }
    }

    return privateApi.$http(httpRequestOptions).then(function(res) {
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
    if (!isBrowserMode) {
        return errorBuilder('LocalTransport can only be used on a Browser instance');
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