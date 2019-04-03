/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {stringify} from 'qs';
import {isFunction, isPlainObject, isNil, omitBy} from 'lodash';

/**
 * Service to send an HTTP request to a URL.
 *
 * Wrapper around the standard Fetch API with some enhancements to streamline the process for
 * the most common use-cases. The Fetch API will be called with CORS enabled, credentials
 * included, and redirects followed.
 *
 * Custom headers can be provided to fetch as a plain object. App-wide default headers
 * can be set using setDefaultHeaders.
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

    /**
     * Set default headers to be sent with all subsequent requests.
     *
     * @param {(Object|function)} headers - Headers to be sent with all fetch requests, or a closure
     *      to generate.
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
     * @param {Object} [opts.headers] - headers to send with this request. A Content-Type header will
     *      be set if not provided by the caller directly or via one of the xxxJson methods on this service.
     * @param {Object} [opts.fetchOpts] - options to pass to the underlying fetch request.
     *      @see {@link https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch}
     * @param {Object} [opts.qsOpts] - options to pass to the param converter library, qs.
     *      The default qsOpts are: {arrayFormat: 'repeat', allowDots: true}.
     *      @see {@link https://www.npmjs.com/package/qs}
     * @param {string} [opts.autoAbortKey] - if set, any pending requests made with the same
     *      autoAbortKey will be immediately aborted in favor of the new request.
     *
     * @returns {Promise<Response>} - Promise which resolves to a Fetch Response.
     */
    async fetch(opts) {
        let {url, method, headers, body, params, autoAbortKey} = opts;
        throwIf(!url, 'No url specified in call to fetchService.');
        throwIf(headers instanceof Headers, 'headers must be a plain object in calls to fetchService.');
        warnIf(opts.contentType, 'contentType has been deprecated - please pass a "Content-Type" header instead.');
        warnIf(opts.acceptJson, 'acceptJson has been deprecated - please pass an {"Accept": "application/json"} header instead.');

        // 1) Compute / install defaults
        if (!method) {
            method = (params ? 'POST' : 'GET');
        }

        if (!url.startsWith('/') && !url.includes('//')) {
            url = XH.baseUrl + url;
        }

        // 2) Compute headers
        const {defaultHeaders} = this,
            baseHeaders = {
                'Content-Type': (method === 'POST') ? 'application/x-www-form-urlencoded': 'text/plain'
            },
            headerEntries = Object.assign(
                baseHeaders,
                isFunction(defaultHeaders) ? defaultHeaders(opts) : defaultHeaders,
                isPlainObject(headers) ? headers : {}
            );

        headers = new Headers(omitBy(headerEntries, isNil));

        // 3) Prepare merged options
        const fetchOpts = Object.assign({
            cors: true,
            credentials: 'include',
            redirect: 'follow'
        }, {
            method,
            headers,
            body,
            ...opts.fetchOpts
        });

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
        const ret = await this.fetch({
            ...opts,
            headers: {
                'Accept': 'application/json',
                ...(withDefault(opts.headers, {}))
            }
        });
        return ret.status === 204 ? null : ret.json();
    }

    /**
     * Send a GET request and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async getJson(opts) {
        return this.fetchJson({
            method: 'GET',
            ...opts
        });
    }

    /**
     * Send a POST request with a JSON bod, and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async postJson(opts) {
        return this.sendJson({
            method: 'POST',
            ...opts
        });
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async putJson(opts) {
        return this.sendJson({
            method: 'PUT',
            ...opts
        });
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * This method delegates to @see {fetch} and accepts the same options.
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async deleteJson(opts) {
        return this.sendJson({
            method: 'DELETE',
            ...opts
        });
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
        return this.fetchJson({
            ...opts,
            body: JSON.stringify(opts.body),
            headers: {
                'Content-Type': 'application/json',
                ...(withDefault(opts.headers, {}))
            }
        });
    }

    async safeResponseTextAsync(response) {
        try {
            return await response.text();
        } catch (ignore) {
            return null;
        }
    }
}