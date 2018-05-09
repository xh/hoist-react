/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/core';
import {Exception} from 'hoist/exception';
import {castArray} from 'lodash';

export class FetchService extends BaseService {

    /**
     * Returns a Promise of an XHR response.
     *
     * @param {Object} opts, standard options for fetch plus
     *      + 'url', relative path, will be enhanced with params for 'GET'
     *      + 'contentType', request contentType header as raw string, e.g. 'text/plain'
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
     * Returns a Promise of a json decoded XHR result.
     *
     * @param opts, standard options for fetch plus
     *
     *      + 'url', relative path, will be enhanced with params for 'GET'
     *      + 'contentType', request contentType header as raw string, e.g. 'text/plain'
     */
    async fetchJson(opts) {
        const ret = await this.fetch(opts);
        return ret.status === 204 ? null : ret.json();
    }
}