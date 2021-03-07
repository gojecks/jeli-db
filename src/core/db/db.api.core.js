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
var CacheMechanism = new Map();

function ApplicationInstanceApi(URL, postData, tbl) {
    var options = privateApi.buildOptions(this.name, tbl, URL),
        $defer = new _Promise();
    if (options.cache && CacheMechanism.has(URL)) {
        var result = CacheMechanism.get(URL);
        $defer.resolve(result);
    } else {
        // set the postData
        postData = postData;
        if (postData) {
            if (options.type && $isEqual(options.type.toLowerCase(), 'get')) {
                options.data.query = postData;
            } else if (postData instanceof FormData) {
                // append all data into formData
                Object.keys(options.data).forEach(function(prop) {
                    postData.append(prop, options.data[prop]);
                });
                options.data = postData;
                options.contentType = false;
                options.processData = false;
            } else {
                options.data.postData = postData;
            }
        }

        privateApi.$http(options)
            .then(function(res) {
                var ret = dbSuccessPromiseObject('api', "");
                ret.result = res;
                ret.__api__ = URL;
                $defer.resolve(ret);
                if (options.cache) {
                    CacheMechanism.set(URL, ret);
                }
            }, function(err) {
                $defer.reject((err.data || { message: "There was an error please try again later" }));
            });
    }

    return $defer;
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