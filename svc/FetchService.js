/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistService, XH} from '@xh/hoist/core';
import {Exception} from '@xh/hoist/exception';
import {isLocalDate} from '@xh/hoist/utils/datetime';
import {throwIf, apiDeprecated, withDefault} from '@xh/hoist/utils/js';
import {StatusCodes} from 'http-status-codes';
import {isDate, isFunction, isNil, omitBy} from 'lodash';
import {stringify} from 'qs';
import {SECONDS} from '@xh/hoist/utils/datetime';

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
export class FetchService extends HoistService {

    abortControllers = {};
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
        return this.withTimeoutAsync(this.fetchInternalAsync(opts), opts);
    }

    /**
     * Send an HTTP request and decode the response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async fetchJson(opts) {
        return this.withTimeoutAsync(
            this.fetchInternalAsync({
                ...opts,
                headers: {'Accept': 'application/json', ...opts.headers}
            }).then(r => [StatusCodes.NO_CONTENT, StatusCodes.RESET_CONTENT].includes(r.status) ? null : r.json()),
            opts
        );
    }

    /**
     * Send a GET request and decode the response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async getJson(opts) {
        return this.fetchJson({method: 'GET', ...opts});
    }

    /**
     * Send a POST request with a JSON body and decode the response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async postJson(opts) {
        return this.sendJsonInternalAsync({method: 'POST', ...opts});
    }

    /**
     * Send a PUT request with a JSON body and decode the response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async putJson(opts) {
        return this.sendJsonInternalAsync({method: 'PUT', ...opts});
    }

    /**
     * Send a PATCH request with a JSON body and decode the response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async patchJson(opts) {
        return this.sendJsonInternalAsync({method: 'PATCH', ...opts});
    }

    /**
     * Send a DELETE request with optional JSON body and decode the optional response as JSON.
     * @param {FetchOptions} opts
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async deleteJson(opts) {
        return this.sendJsonInternalAsync({method: 'DELETE', ...opts});
    }

    //-----------------------
    // Implementation
    //-----------------------
    async withTimeoutAsync(promise, opts) {
        const timeout = withDefault(opts.timeout, 30 * SECONDS);
        return promise
            .timeout(timeout)
            .catchWhen('Timeout Exception', e => {
                throw Exception.fetchTimeout(opts, e, opts.timeout?.message);
            });
    }

    async fetchInternalAsync(opts) {
        const {defaultHeaders, abortControllers} = this;
        let {url, method, headers, body, params, autoAbortKey} = opts;
        throwIf(!url, 'No url specified in call to fetchService.');
        throwIf(headers instanceof Headers, 'headers must be a plain object in calls to fetchService.');
        apiDeprecated(opts.contentType, 'contentType', 'Please pass a "Content-Type" header instead.');
        apiDeprecated(opts.acceptJson, 'acceptJson', 'Please pass an {"Accept": "application/json"} header instead.');

        // 1) Compute / install defaults
        if (!method) {
            method = (params ? 'POST' : 'GET');
        }

        if (!url.startsWith('/') && !url.includes('//')) {
            url = XH.baseUrl + url;
        }

        // 2) Compute headers
        const headerEntries = {
            'Content-Type': (method === 'POST') ? 'application/x-www-form-urlencoded' : 'text/plain',
            ...(isFunction(defaultHeaders) ? defaultHeaders(opts) : defaultHeaders),
            ...headers
        };

        headers = new Headers(omitBy(headerEntries, isNil));

        // 3) Prepare merged options
        const fetchOpts = {
            credentials: 'include',
            redirect: 'follow',
            method,
            headers,
            body,
            ...opts.fetchOpts
        };

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
        let abortCtrl;
        if (autoAbortKey) {
            this.abort(autoAbortKey);
            abortCtrl = new AbortController();
            fetchOpts.signal = abortCtrl.signal;
            abortControllers[autoAbortKey] = abortCtrl;
        }

        let ret;
        try {
            ret = await fetch(url, fetchOpts);
        } catch (e) {
            if (e.name === 'AbortError') throw Exception.fetchAborted(opts, e);
            throw Exception.serverUnavailable(opts, e);
        } finally {
            if (abortCtrl && abortControllers[autoAbortKey] === abortCtrl) {
                delete abortControllers[autoAbortKey];
            }
        }

        if (!ret.ok) {
            ret.responseText = await this.safeResponseTextAsync(ret);
            throw Exception.fetchError(opts, ret);
        }

        return ret;
    }

    async sendJsonInternalAsync(opts) {
        return this.fetchJson({
            ...opts,
            body: JSON.stringify(opts.body),
            headers: {
                'Content-Type': 'application/json',
                ...opts.headers
            }
        });
    }

    abort(key) {
        const ctrl = this.abortControllers[key];
        if (ctrl) {
            delete this.abortControllers[key];
            ctrl.abort();
        }
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
    };

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
 * @property {(number|Object)} [timeout] - ms to wait for response before rejecting with a timeout
 *      exception.  Defaults to 30 seconds, but may be specified as null to specify no timeout.
 *      May also be specified as an object to customise the exception. See Promise.timeout().
 * @property {LoadSpec} [loadSpec] - optional metadata about the underlying request. Passed through
 *      for downstream processing by utils such as {@see ExceptionHandler}.
 * @property {Object} [fetchOpts] - options to pass to the underlying fetch request.
 *      @see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch
 * @property {Object} [qsOpts] - options to pass to the param converter library, qs.
 *      The default qsOpts are: `{arrayFormat: 'repeat', allowDots: true}`.
 *      @see https://www.npmjs.com/package/qs
 * @property {string} [autoAbortKey] - if set, any pending requests made with the same autoAbortKey
 *      will be immediately aborted in favor of the new request.
 */
