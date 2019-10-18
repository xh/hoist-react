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
import {isFunction, isPlainObject, isNil, isDate, omitBy} from 'lodash';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {NO_CONTENT, RESET_CONTENT} from 'http-status-codes';

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
     * @param {(Object|function)} headers - Headers to be sent with all fetch requests,
     *      or a function to generate.
     */
    setDefaultHeaders(headers) {
        this.defaultHeaders = headers;
    }

    /**
     * Send a request via the underlying fetch API.
     * @param {FetchOptions} opts
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
            const qsOpts = {
                arrayFormat: 'repeat',
                allowDots: true,
                filter: this.qsFilterFn,
                ...opts.qsOpts
            };
            const paramsString = stringify(params, qsOpts);

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
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async fetchJson(opts) {
        const ret = await this.fetch({
            ...opts,
            headers: {'Accept': 'application/json', ...opts.headers}
        });
        switch (ret.status) {
            case NO_CONTENT:
            case RESET_CONTENT:
                return null;
            default:
                return ret.json();
        }
    }

    /**
     * Send a GET request and decode the response as JSON.
     * @param {FetchOptions} opts
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
     * @param {FetchOptions} opts
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
     * @param {FetchOptions} opts
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
     * @param {FetchOptions} opts
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
                ...opts.headers
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

    qsFilterFn = (prefix, value) => {
        if (isDate(value))      return value.getTime();
        if (isLocalDate(value)) return value.isoString;
        return value;
    }
}

/**
 * @typedef {Object} FetchOptions
 *      Standard options to pass through to fetch, with some additions.
 *      [See MDN for available options]{@link https://developer.mozilla.org/en-US/docs/Web/API/Request}.
 * @property {string} url - url for the request. Relative urls will be appended to XH.baseUrl.
 * @property {Object} [body] - data to send in the request body (for POSTs/PUTs of JSON).
 * @property {Object} [params] - parameters to encode and append as a query string, or send
 *      with the request body (for POSTs/PUTs sending form-url-encoded).
 * @property {string} [method] - HTTP Request method to use for the request. If not specified,
 *      the method will be set to POST if there are params, otherwise GET.
 * @property {Object} [headers] - headers to send with this request. A Content-Type header will
 *      be set if not provided by the caller directly or via one of the xxxJson convenience methods.
 * @property {Object} [fetchOpts] - options to pass to the underlying fetch request.
 *      @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 * @property {Object} [qsOpts] - options to pass to the param converter library, qs.
 *      The default qsOpts are: `{arrayFormat: 'repeat', allowDots: true}`.
 *      @see https://www.npmjs.com/package/qs
 * @property {string} [autoAbortKey] - if set, any pending requests made with the same autoAbortKey
 *      will be immediately aborted in favor of the new request.
 */