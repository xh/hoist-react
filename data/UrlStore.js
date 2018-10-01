/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';

import {LocalStore} from './LocalStore';

/**
 * A store with built-in support for loading data from a URL.
 */
export class UrlStore extends LocalStore {

    url;
    dataRoot;

    /**
     * @param {Object} c - UrlStore configuration.
     * @param {string} c.url - URL from which to load data.
     * @param {?string} [c.dataRoot] - Key of root node for records in returned data object.
     * @param {...*} - Additional arguments to pass to LocalStore.
     */
    constructor({url, dataRoot = null, ...localStoreArgs}) {
        super(localStoreArgs);
        this.url = url;
        this.dataRoot = dataRoot;
    }

    /**
     * Reload store from url.
     */
    async loadAsync() {
        const {url, dataRoot} = this;
        return XH
            .fetchJson({url})
            .then(data => {
                if (dataRoot) data = data[dataRoot];
                return this.loadData(data);
            })
            .linkTo(this.loadModel);
    }
}