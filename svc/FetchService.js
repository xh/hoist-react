/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {throwIf, warnIf} from '@xh/hoist/utils/js';
import {stringify} from 'qs';
import {isFunction, isPlainObject} from 'lodash';

/**
 * Service to send an HTTP request to a URL.
 *
 * Wrapper around the standard Fetch API with some enhancements to streamline the process for
 * the most common use-cases. The Fetch API will be called with CORS enabled, credentials
 * included, and redirects followed.
 *
 * Custom headers can be provide to fetch as either a plain object or a Headers object.
 * App-wide default headers can be set using setDefaultHeaders. Default headers can also be
 * provided via `AppSpec.defaultFetchHeaders`
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API|Fetch API Docs}
 *
 * Note that the convenience methods 'fetchJson', 'postJson', 'putJson' all accept the same options
 * as the main entry point 'fetch', as they delegate to fetch after setting additional defaults.
 */
@HoistService
export class FetchService {

    autoAbortControllers = {};
    defaultHeaders = {};

    constructor() {
        const {defaultFetchHeaders} = XH.appSpec;
        if (defaultFetchHeaders) this.setDefaultHeaders(defaultFetchHeaders);
    }

    /**
     * Set default headers to be sent with all subsequent requests.
     *
     * @param {Object|function} headers - Headers to be sent with all fetch requests, or a closure to generate
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = headers;
    }

    /**
     * Send a request via the underlying fetch API.
     *
     * @param {Object} opts - standard options to pass through to fetch, with some additions.
     *     @see https://developer.mozilla.org/en-US/docs/Web/API/Request for the available options
     * @param {string} opts.url - url for the request. Relative urls will be appended to XH.baseUrl.
     * @param {Object} [opts.body] - data to send in the request body (for POSTs/PUTs of JSON).
     * @param {Object} [opts.params] - parameters to encode and append as a query string, or send
     *      with the request body (for POSTs/PUTs sending form-url-encoded).
     * @param {string} [opts.method] - HTTP Request method to use for the request. If not specified,
     *      the method will be set to POST if there are params, otherwise GET.
     * @param {Object|Headers} [opts.headers] - headers to send with this request. If an Object,
     *      will be merged with existing default headers. A Content-Type header will be set if not
     *      provided by the caller directly or via one of the dedicated xxxJson methods on this service.
     *      Alternatively, provide an instantiated Headers object to replace default headers entirely.
     * @param {boolean} [opts.acceptJson] - true to set Accept header to 'application/json'.
     * @param {Object} [opts.qsOpts] - options to pass to the param converter library, qs.
     *      The default qsOpts are: {arrayFormat: 'repeat', allowDots: true}.
     *      @see {@link https://www.npmjs.com/package/qs}
     * @param {string} [opts.autoAbortKey] - if set, any pending requests made with the same
     *      autoAbortKey will be immediately aborted in favor of the new request.
     *
     * @returns {Promise<Response>} - Promise which resolves to a Fetch Response.
     */
    async fetch(opts) {
        let {params, method, headers, url, autoAbortKey} = opts;
        throwIf(!url, 'No url specified in call to fetchService.');
        warnIf(opts.contentType, 'contentType has been deprecated - please pass a "Content-Type" header instead.');

        // 1) Compute / install defaults
        if (!method) {
            method = (params ? 'POST' : 'GET');
        }

        if (!url.startsWith('/') && !url.includes('//')) {
            url = XH.baseUrl + url;
        }

        // 2) Compute headers
        if (!(headers instanceof Headers)) {
            const baseHeaders = {
                'Content-Type': (method === 'POST') ? 'application/x-www-form-urlencoded': 'text/plain'
            };
            if (opts.acceptJson) {
                baseHeaders['Accept'] = 'application/json';
                delete opts.acceptJson;
            }

            const {defaultHeaders} = this;
            headers = new Headers(Object.assign(
                baseHeaders,
                isFunction(defaultHeaders) ? defaultHeaders() : defaultHeaders,
                isPlainObject(headers) ? headers : {}
            ));
        }
        delete opts.headers;

        // 3) Prepare merged options
        const defaults = {
                method,
                headers,
                cors: true,
                credentials: 'include',
                redirect: 'follow'
            },
            fetchOpts = Object.assign(defaults, opts);

        // 3) Preprocess and apply params
        if (params) {
            const qsOpts = {arrayFormat: 'repeat', allowDots: true, ...opts.qsOpts},
                paramsString = stringify(params, qsOpts);

            if (['POST', 'PUT'].includes(method) && headers.get('Content-Type') !== 'application/json') {
                // Fall back to an 'application/x-www-form-urlencoded' POST/PUT body if not sending json.
                fetchOpts.body = paramsString;
            } else {
                url += '?' + paramsString;
            }
        }

        // 4) Cancel prior request, and add new AbortController if autoAbortKey used
        if (autoAbortKey) {
            this.abort(autoAbortKey);
            const ctlr = new AbortController();
            fetchOpts.signal = ctlr.signal;
            this.autoAbortControllers[autoAbortKey] = ctlr;
        }

        delete fetchOpts.url;

        let ret;
        try {
            ret = await fetch(url, fetchOpts);
        } catch (e) {
            if (e.name == 'AbortError') throw Exception.fetchAborted(opts, e);
            throw Exception.serverUnavailable(opts, e);
        }

        if (autoAbortKey) {
            delete this.autoAbortControllers[autoAbortKey];
        }

        if (!ret.ok) {
            ret.responseText = await this.safeResponseTextAsync(ret);
            throw Exception.fetchError(opts, ret);
        }

        return ret;
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async fetchJson(opts) {
        const ret = await this.fetch({acceptJson: true, ...opts});
        return ret.status === 204 ? null : ret.json();
    }

    /**
     * Send a GET request and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async getJson(opts) {
        opts.method = 'GET';
        return this.fetchJson(opts);
    }

    /**
     * Send a POST request with a JSON bod, and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async postJson(opts) {
        opts.method = 'POST';
        return this.sendJson(opts);
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async putJson(opts) {
        opts.method = 'PUT';
        return this.sendJson(opts);
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async deleteJson(opts) {
        opts.method = 'DELETE';
        return this.sendJson(opts);
    }


    //-----------------------
    // Implementation
    //-----------------------
    abort(key) {
        const ctrl = this.autoAbortControllers[key];
        if (ctrl) {
            delete this.autoAbortControllers[key];
            ctrl.abort();
        }
    }

    async sendJson(opts) {
        opts = {
            ...opts,
            body: JSON.stringify(opts.body),
            headers: {'Content-Type': 'application/json'}
        };
        return this.fetchJson(opts);
    }

    async safeResponseTextAsync(response) {
        try {
            return await response.text();
        } catch (ignore) {
            return null;
        }
    }
}