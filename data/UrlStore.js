/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';

import {LocalStore} from './LocalStore';

/**
 * A store with built-in support for loading data from a url.
 */
export class UrlStore extends LocalStore {

    url = '';
    dataRoot = null;

    /**
     * Construct this object.
     *
     * @param url, required.
     * @param dataRoot, optional.  Name of root node for records in returned data.
     */
    constructor({url, dataRoot = null, ...rest}) {
        super(rest);
        this.url = url;
        this.dataRoot = dataRoot;
    }

    /**
     * Reload store from url
     */
    async loadAsync() {
        const {url, dataRoot} = this;
        return XH
            .fetchJson({url})
            .then(data => {
                if (dataRoot) data = data[dataRoot];
                return this.loadDataInternal(data);
            })
            .linkTo(this.loadModel);
    }
}