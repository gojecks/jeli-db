/**
 * 
 * @param {*} interceptor 
 * @param {*} changeDetection 
 * @param {*} support 
 */
function AjaxSetup(interceptor) {
    var defaultOptions = {
        url: "",
        type: 'GET',
        processData: true,
        contentType: true,
        headers: {
            'Accept': 'text/javascript, application/json, text/html, application/xml, text/xml, */*'
        },
        asynchronous: true,
        data: '',
        xhr: null,
        getResponseHeader: null,
        cache: null
    };

    var unsafeHeaders = {
        'Accept-Charset': true,
        'Accept-Encoding': true,
        'Connection': true,
        'Content-Length': true,
        'Cookie': true,
        'Cookie2': true,
        'Content-Transfer-Encoding': true,
        'Date': true,
        'Expect': true,
        'Host': true,
        'Keep-Alive': true,
        'Referer': true,
        'TE': true,
        'Trailer': true,
        'Transfer-Encoding': true,
        'Upgrade': true,
        'User-Agent': true,
        'Via': true
    };

    /**
     * 
     * @param {*} string 
     * @param {*} tError 
     */
    function parseJSON(string, tError) {
        var content;
        try {
            content = JSON.parse(string);
        } catch (e) {
            if (tError) {
                throw new Error(e);
            } else {
                content = string;
            }
        }

        return content
    }

    var CacheMechanism = new Map();
    /**
     * 
     * @param {*} url 
     * @param {*} options 
     */
    return function(url, options) {
        if ($isUndefined(options) && $isObject(url)) {
            options = url;
        }

        if (options.isErrorState) {
            return Promise.reject({
                message: options.isErrorState
            });
        }

        var response = {};
        var dbPromiseExtension = new DBPromise.extension(function(e) {}, ['progress']);
        options = extend(true, defaultOptions, options);
        options.url = options.url || url;
        options.type = options.type.toLowerCase();
        var request = options.xhr || new XMLHttpRequest();
        /**
         * $httpProvider Interceptor
         * Request Interceptor
         **/
        if (interceptor) {
            options = interceptor.resolveInterceptor('request', options);
            if (!options) {
                throw new Error('$HTTP: Interceptor should return a value');
            }
        }

        /**
         * @method getResponseHeaders
         * @param {*} name 
         */
        function getResponseHeaders(name) {
            if (!$isObject(name)) {
                return request.getResponseHeader(name);
            } else {
                for (var i in name) {
                    name[i] = request.getResponseHeader(name[i]);
                }

                return name;
            }
        }

        /**
         * set Request Headers
         */
        function setHeaders() {
            for (var name in options.headers) {
                if (unsafeHeaders[name] || /^(Sec-|Proxy-)/.test(name)) {
                    throw new Error("Refused to set unsafe header \"" + name + "\"");
                }

                request.setRequestHeader(name, options.headers[name]);
            }
        }

        /**
         * process Request
         */
        function processRequest() {
            //check if header requires withCredentials flag
            if (options.xhrFields && options.xhrFields.withCredentials) {
                //set the withCredentials Flag
                request.withCredentials = true;
            }

            if (options.contentType && !options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }


            if (!$isString(options.data)) {
                if ($isEqual(options.type, 'get')) {
                    options.data = serialize(options.data);
                } else {
                    options.data = JSON.stringify(options.data);
                }
            }

            //Set the options data and cache
            if (options.type === 'get') {
                if (options.data) {
                    options.url += ((/\?/).test(options.url) ? '&' : '?') + options.data;
                }

                if (!options.cache) {
                    options.url += ((/\?/).test(options.url) ? '&' : '?') + '_=' + (new Date()).getTime();
                }
            }
        }

        function getCacheId() {
            return ($isObject(options.cache) && options.cache.id) ? options.cache.id : options.url;
        }

        /**
         * default ttl is 15mins
         * @param {*} data 
         */
        function storeCache(data, cacheId) {
            var ttl = (($isObject(options.cache) && options.cache.ttl) ? options.cache.ttl : ($isNumber(options.cache)) ? options.cache : 15);
            var expiresAt = new Date().setMilliseconds(60 * ttl * 1000);
            CacheMechanism.set(cacheId || getCacheId(), {
                data: data,
                expiresAt: expiresAt
            });
            var now = Date.now();
            CacheMechanism.forEach(function(item, key) {
                if (now > item.expiresAt) {
                    CacheMechanism.delete(key);
                }
            });
        }

        function cleanup() {
            options = null;
            request = null;
            response = null;
        }

        /**
         * 
         * @param {*} resolve 
         * @param {*} reject 
         */
        function sendRequest() {
            request.open(options.type, options.url, options.asynchronous);
            //handle before send
            //function recieves the XMLHTTPREQUEST
            if (options.beforeSend && $isFunction(options.beforeSend)) {
                options.beforeSend.apply(options.beforeSend, [request]);
            }

            setHeaders();
            var body = null;
            if ($inArray(options.type, ['post', 'put', 'delete'])) {
                body = options.data;
            }
            //send the request
            try {
                request.send(body);
            } catch (e) {
                if (options.error) {
                    options.error();
                }
            }
        }

        return new DBPromise(function(resolve, reject) {
            // check for cacheOptions
            if (options.cache) {
                var cacheId = getCacheId();
                var cacheResult = CacheMechanism.get(cacheId);
                var now = Date.now();
                if (cacheResult && cacheResult.expiresAt > now) {
                    return resolve(cacheResult.data);
                } else {
                    // remove the cache
                    CacheMechanism.delete(cacheId);
                }
            }
            // process requestData
            if (options.processData) {
                processRequest();
            }

            request.addEventListener('loadend', function(event) {
                if (request.readyState == 4) {
                    response.contentType = options.dataType || request.mimeType || request.getResponseHeader('content-type') || '';
                    response.status = request.status;
                    response.path = options.url;
                    response.success = (
                        (request.status >= 200 && request.status < 300) ||
                        request.status == 304 ||
                        (request.status == 0 && request.responseText)
                    );
                    //intercept response
                    if (interceptor) {
                        interceptor.resolveInterceptor('response', response);
                    }

                    //send the response header
                    if (options.getResponseHeader) {
                        options.getResponseHeader.apply(options.getResponseHeader, [getResponseHeaders]);
                    }

                    //resolve our response
                    if (response.success) {
                        var result = parseJSON(request.responseText, false);
                        resolve(result);
                        if (options.cache) {
                            storeCache(result, cacheId);
                        }
                    } else {
                        reject(response);
                    }

                    cleanup();
                }
            });
            // add progress listener
            request.addEventListener('progress', function(event) {
                dbPromiseExtension.call('progress', [event.loaded, event.total])
            });

            sendRequest();
        }, dbPromiseExtension.handlers);
    };
}