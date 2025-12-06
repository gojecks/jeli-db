/**
 * 
 * @param {*} interceptor 
 * @param {*} changeDetection 
 * @param {*} support 
 */
class AjaxSetup {
    static CacheMechanism = new Map();
    static unsafeHeaders = {
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

    static interceptor = Object.create({
        resolveInterceptor: (type, options) => {
            if (_globalInterceptors.has(type)) {
                _globalInterceptors.get(type).forEach((interceptor) => interceptor(options));
            }
            return options;
        }
    })

    /**
     * 
     * @param {*} string 
     * @param {*} tError 
     */
    static parseJSON(string, tError) {
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

    /**
     * 
     * @param {*} request 
     * @param {*} name 
     * @returns any
     */
    static getResponseHeaders(request, name) {
        if (!isobject(name)) {
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
    static setHeaders(request, options) {
        for (var name in options.headers) {
            if (this.unsafeHeaders[name] || /^(Sec-|Proxy-)/.test(name)) {
                throw new Error("Refused to set unsafe header \"" + name + "\"");
            }

            request.setRequestHeader(name, options.headers[name]);
        }
    }

    /**
     * 
     * @param {*} options 
     */
    static processRequest(options) {
        //check if header requires withCredentials flag
        if (options.xhrFields && options.xhrFields.withCredentials) {
            //set the withCredentials Flag
            request.withCredentials = true;
        }

        if (!isstring(options.data)) {
            if (isequal(options.type, 'get')) {
                options.data = serialize(options.data);
            } else {
                options.data = JSON.stringify(options.data);
                options.headers['Content-Type'] = 'application/json';
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

    /**
     * 
     * @param {*} options 
     * @returns 
     */
    static getCacheId(options) {
        return (isobject(options.cache) && options.cache.id) ? options.cache.id : options.url;
    }

    /**
     * store the cache data to cache mechanism
     * @param {*} data 
     * @param {*} cacheId 
     * @param {*} cache 
     */
    static storeCache(data, cacheId, cache) {
        if (!cacheId) return;
        const ttl = ((isobject(cache) && cache.ttl) ? cache.ttl : (isnumber(cache)) ? cache : 15);
        const expiresAt = new Date().setMilliseconds(60 * ttl * 1000);
        this.CacheMechanism.set(cacheId, {
            data: data,
            expiresAt: expiresAt
        });

        this.CacheMechanism.forEach((item, key) => {
            if (Date.now() > item.expiresAt) {
                this.CacheMechanism.delete(key);
            }
        });
    }

    /**
     * @param {*} options 
     * @returns 
     */
    static getOptions(options) {
        return Object.assign({
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
        }, options);
    }

    /**
     * 
     * @param {*} resolve 
     * @param {*} reject 
     */
    static sendRequest(request, options) {
        request.open(options.type, options.url, options.asynchronous);
        //handle before send
        //function recieves the XMLHTTPREQUEST
        if (options.beforeSend && isfunction(options.beforeSend)) {
            options.beforeSend.apply(options.beforeSend, [request]);
        }

        this.setHeaders(request, options);
        let body = null;
        if (inarray(options.type, ['post', 'put', 'delete'])) {
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

    static request(url, options) {
        if (isundefined(options) && isobject(url)) {
            options = url;
        }

        const dbPromiseExtension = new DBPromiseExtension(noop, ['progress']);
        return new DBPromise((resolve, reject) => {
            if (options.isErrorState) {
                return reject({
                    message: options.isErrorState
                });
            }

            const request = options.xhr || new XMLHttpRequest();
            /**
             * $httpProvider Interceptor
             * Request Interceptor
             **/
            if (this.interceptor) {
                options = this.interceptor.resolveInterceptor('request', options);
                if (!options) {
                    throw new Error('$HTTP: Interceptor should return a value');
                }
            }

            // check for cacheOptions
            var cacheId = null;
            if (options.cache) {
                cacheId = this.getCacheId(options);
                const cacheResult = this.CacheMechanism.get(cacheId);
                const now = Date.now();
                if (cacheResult && cacheResult.expiresAt > now) {
                    //intercept response
                    if (this.interceptor) {
                        this.interceptor.resolveInterceptor('response', {
                            status: 200,
                            fromCache: true,
                            path: options.url
                        });
                    }

                    return resolve(cacheResult.data);
                } else {
                    // remove the cache
                    this.CacheMechanism.delete(cacheId);
                }
            }

            // process requestData
            if (options.processData) {
                this.processRequest(options);
            }

            request.addEventListener('loadend', () => {
                if (request.readyState == 4) {
                    const response = {
                        contentType: options.dataType || request.mimeType || request.getResponseHeader('content-type') || '',
                        status: request.status,
                        path: options.url,
                        success: (
                            (request.status >= 200 && request.status < 300) ||
                            request.status == 304 ||
                            (request.status == 0 && request.responseText)
                        )
                    };
                    //intercept response
                    if (this.interceptor) {
                        this.interceptor.resolveInterceptor('response', response);
                    }

                    //send the response header
                    const _csrfToken = request.getResponseHeader('X-CSRF-TOKEN');
                    if (_csrfToken) {
                        $cookie('X-CSRF-TOKEN', _csrfToken);
                    }

                    const result = this.parseJSON((request.responseText || '').trim(), false);
                    if (response.success) {
                        resolve(result);
                        if (options.cache) {
                            this.storeCache(result, cacheId, options.cache);
                        }
                    } else {
                        reject(result);
                    }
                }
            });
            // add progress listener
            request.addEventListener('progress', event => dbPromiseExtension.call('progress', [event.loaded, event.total]));

            this.sendRequest(request, options);
        }, dbPromiseExtension.handlers);
    }
}