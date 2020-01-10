/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {UrlStore} from '@xh/hoist/data';
import {filter, pickBy} from 'lodash';

import {RestField} from './RestField';

/**
 * Store with additional support for RestGrid.
 *
 * Provides support for lookups, and CRUD operations on records.
 */
export class RestStore extends UrlStore {

    _lookupsLoaded = false;

    /**
     * @param {Object} c - RestStore configuration.
     * @param {string} c.url - URL from which to load data.
     * @param {?string} [c.dataRoot] - Key of root node for records in returned data object. Null if data objects are at the root
     * @param {boolean} [c.reloadLookupsOnLoad] - Whether lookups should be loaded each time
     *      new data is loaded or updated by this client.
     * @param {...*} - Additional arguments to pass to UrlStore.
     */
    constructor({url, dataRoot = 'data', reloadLookupsOnLoad = false, ...urlStoreArgs}) {
        super({url, dataRoot, ...urlStoreArgs});
        this.reloadLookupsOnLoad = reloadLookupsOnLoad;
    }

    get defaultFieldClass() {
        return RestField;
    }

    async doLoadAsync(loadSpec) {
        await this.ensureLookupsLoadedAsync();
        return super.doLoadAsync(loadSpec);
    }

    async deleteRecordAsync(rec) {
        const {url} = this;

        return XH.fetchJson({
            url: `${url}/${rec.id}`,
            method: 'DELETE'
        }).then(() => {
            this.loadDataUpdates({remove: [rec.id]});
        }).linkTo(
            this.loadModel
        );
    }

    async addRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, true)
            .linkTo(this.loadModel);
    }

    async saveRecordAsync(rec) {
        return this.saveRecordInternalAsync(rec, false)
            .linkTo(this.loadModel);
    }

    //--------------------------------
    // Implementation
    //--------------------------------
    async saveRecordInternalAsync(rec, isAdd) {
        let {url, dataRoot} = this;
        if (!isAdd) url += '/' + rec.id;

        // Only include editable fields in the request data
        const editableFields = filter(this.fields, 'editable').map(it => it.name),
            data = {
                id: rec.id,
                ...pickBy(rec.data, (v, k) => editableFields.includes(k))
            };

        const fetchMethod = isAdd ? 'postJson' : 'putJson',
            response = await XH.fetchService[fetchMethod]({url, body: {data}}),
            responseData = (dataRoot) ? response[dataRoot] : response;

        this.loadDataUpdates([responseData]);

        await this.ensureLookupsLoadedAsync();

        return this.getById(responseData.id);
    }

    async ensureLookupsLoadedAsync() {
        if (!this._lookupsLoaded || this.reloadLookupsOnLoad) {
            const lookupFields = this.fields.filter(it => !!it.lookupName);
            if (lookupFields.length) {
                const lookupData = await XH.fetchJson({url: `${this.url}/lookupData`});
                lookupFields.forEach(f => {
                    f.lookup = lookupData[f.lookupName];
                });
            }
            this._lookupsLoaded = true;
        }
    }
}
