/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH, HoistService} from 'hoist/core';
import {Exception} from 'hoist/exception';
import {castArray} from 'lodash';

@HoistService()
export class FetchService {
    /**
     * Send an HTTP request to a URL.
     *
     * Wrapper around the standard Fetch API with some enhancements to streamline the process for
     * the most common use-cases. The Fetch API will be called with CORS enabled, credentials
     * included, and redirects followed.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
     *
     * @param {Object} opts - options to pass through to fetch, with some additions.
     *      @see https://developer.mozilla.org/en-US/docs/Web/API/Request for the available options
     * @param {string} opts.url - target url to send the HTTP request to. Relative urls will be
     *     appended to XH.baseUrl for the request
     * @param {string} [opts.method] - The HTTP Request method to use for the request. If not
     *     explicitly set in opts then the method will be set to POST if there are params,
     *     otherwise it will be set to GET.
     * @param {string} [opts.contentType] - value to use in the Content-Type header in the request.
     *     If not explicitly set in opts then the contentType will be set based on the method. POST
     *     requests will use 'application/x-www-form-urlencoded', otherwise 'text/plain' will be
     *     used.
     *
     * @returns {Promise<Response>} @see https://developer.mozilla.org/en-US/docs/Web/API/Response
     */
    async fetch(opts) {
        let {params, method, contentType, url} = opts;

        // 1) Compute / install defaults
        if (!method) {
            method = (params ? 'POST' : 'GET');
        }

        if (!contentType) {
            contentType = (method === 'POST') ? 'application/x-www-form-urlencoded': 'text/plain';
        }

        if (!url.startsWith('/') && !url.includes('//')) {
            url = XH.baseUrl + url;
        }

        // 2) Prepare merged options
        const defaults = {
            method,
            cors: true,
            credentials: 'include',
            redirect: 'follow',
            headers: new Headers({'Content-Type': contentType})
        };
        opts = Object.assign(defaults, opts);
        delete opts.contentType;
        delete opts.url;

        // 3) preprocess and apply params
        if (params) {
            const paramsStrings = [];
            Object.entries(params).forEach(v => {
                const key = v[0],
                    vals = castArray(v[1]);
                vals.forEach(val => paramsStrings.push(`${key}=${encodeURIComponent(val)}`));
            });
            const paramsString = paramsStrings.join('&');

            if (method === 'POST') {
                opts.body = paramsString;
            } else {
                url += '?' + paramsString;
            }
        }

        const ret = await fetch(url, opts);
        if (!ret.ok) throw Exception.requestError(opts, ret);
        return ret;
    }

    /**
     * Send an HTTP request to a URL, and decode the response as JSON.
     *
     * @see {@link fetch} for more details
     *
     * @returns {Promise} the decoded JSON object, or null if the response had no content.
     */
    async fetchJson(opts) {
        const ret = await this.fetch(opts);
        return ret.status === 204 ? null : ret.json();
    }
}