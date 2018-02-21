/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {BaseService} from './BaseService';
import {XH} from 'hoist/app';
import {Exception} from 'hoist/exception';

export class FetchService extends BaseService {
    
    /**
     * Returns a Promise of a json decoded XHR result.
     *
     * @param opts, standard options for fetch, plus relative 'url'
     */
    async fetchJson(opts) {
        let url = XH.BASE_URL + opts.url;

        const params = opts.params,
            method = opts.method || params ? 'POST' : 'GET',
            isPost = method.toUpperCase() === 'POST';

        // Options
        opts = isPost ? this.postOpts(opts) : this.getOpts(opts);

        // Params
        if (params) {
            const paramsString = Object.entries(params).map(v => `${v[0]}=${v[1]}`).join('&');
            if (isPost) {
                opts.body = paramsString;
            } else {
                url += '?' + paramsString;
            }
        }

        const ret = await fetch(url, opts);
        if (!ret.ok) throw Exception.requestError(opts, ret);
        return ret.json();
    }

    //----------------------------
    // Implementation
    //-----------------------------
    postOpts(opts) {
        const postOpts = {
            method: 'POST',
            headers: new Headers({'Content-Type': 'application/x-www-form-urlencoded'})
        };
        return Object.assign(this.defaultOpts(), postOpts, opts);
    }

    getOpts(opts) {
        const getOpts = {
            method: 'GET',
            headers: new Headers({'Content-Type': 'text/plain'})
        };
        return Object.assign(this.defaultOpts(), getOpts, opts);
    }

    defaultOpts() {
        return {
            cors: true,
            credentials: 'include',
            redirect: 'follow'
        };
    }
}