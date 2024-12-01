/**
 * 
 * @param {*} url 
 * @param {*} success 
 * @param {*} error 
 * @returns 
 */
function framTransport(url, success, error) {
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