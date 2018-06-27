/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';

import {UrlStore} from '@xh/hoist/data';

import {RestField} from './RestField';

/**
 * Store with additional support for RestGrid.
 *
 * Provides support for lookups, and CRUD operations on records.
 */
export class RestStore extends UrlStore {

    _lookupsLoaded = false;

    /**
     * @param {string} url
     * @param {string} [dataRoot] - Name of root node for records in returned data
     * @param {boolean} [reloadLookupsOnLoad] - Whether lookups should be loaded each time loadAsync is called
     * @param {...*} [urlStoreArgs] - Additional arguments to pass to UrlStore.
     */
    constructor({url, dataRoot = 'data', reloadLookupsOnLoad = false, ...urlStoreArgs}) {
        super({url, dataRoot, ...urlStoreArgs});
        this.reloadLookupsOnLoad = reloadLookupsOnLoad;
    }

    get defaultFieldClass() {
        return RestField;
    }

    async loadAsync() {
        if (!this._lookupsLoaded || this.reloadLookupsOnLoad) {
            const lookupFields = this.fields.filter(it => !!it.lookupName);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookup = lookupData[f.lookupName];
                });
                this._lookupsLoaded = true;
            }
        }
        return super.loadAsync();
    }

    async deleteRecordAsync(rec) {
        const {url} = this;

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.deleteRecordInternal(rec);
        }).linkTo(
            this.loadModel
        );
    }

    async addRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, true);
    }

    async saveRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, false);
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    async saveRecordInternalAsync(rec, isAdd) {
        let {url} = this;
        if (!isAdd) url += '/' + rec.id;
        return XH.fetchJson({
            url,
            method: isAdd ? 'POST' : 'PUT',
            contentType: 'application/json',
            body: JSON.stringify({data: rec})
        }).then(response => {
            const recs = this.createRecordMap([response.data]);
            this.updateRecordInternal(recs.values().next().value);
        }).linkTo(
            this.loadModel
        );
    }
}