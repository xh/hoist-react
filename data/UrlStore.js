/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH, managed, LoadSupport} from '@xh/hoist/core';

import {Store} from './Store';

/**
 * A store with built-in support for loading data from a URL.
 */
export class UrlStore extends Store {

    url;
    dataRoot;

    @managed
    loadSupport = new LoadSupport(this);

    /**
     * @param {Object} c - UrlStore configuration.
     * @param {string} c.url - URL from which to load data.
     * @param {?string} [c.dataRoot] - Key of root node for records in returned data object.
     * @param {...*} - Additional arguments to pass to Store.
     */
    constructor({url, dataRoot = null, ...localStoreArgs}) {
        super(localStoreArgs);
        this.url = url;
        this.dataRoot = dataRoot;
    }

    /**
     * Reload store from url.
     */
    async doLoadAsync(loadSpec) {
        const {url, dataRoot} = this;
        let data = await XH.fetchJson({url, loadSpec});
        if (dataRoot) data = data[dataRoot];
        this.loadData(data);
    }
}